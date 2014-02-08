package touches

import (
        "log"
        "net/http"
        "strconv"

        "code.google.com/p/go.net/websocket"
)

const NEW_CONNECTION_ENDPOINT = "/connect"

type Server struct {
	clients 		map[int]*Client

	gridMap			map[int]*Grid // grids are like chat rooms
	
	addCh			chan *Client
	delCh			chan *Client
	messageCh 		chan *Message
	doneCh			chan bool
	errCh			chan error
}

// Create new Server
func NewServer() *Server {
	clients 		:= make(map[int]*Client)

	/* Server starts off with no Grids
		Grids are added and removed based on clients connecting/disconnecting */
	gridMap 		:= make(map[int]*Grid)

	addCh 			:= make(chan *Client)
	delCh 			:= make(chan *Client)
	messageCh 		:= make(chan *Message)
	doneCh 			:= make(chan bool)
	errCh 			:= make(chan error)
	return &Server{
		clients,
		gridMap,
		addCh,
		delCh,
		messageCh,
		doneCh,
		errCh,
	}
}

// Clients talk to the server and we put message on a channel for the Server to handle later
func (s *Server) AddClientConnection(c *Client) {
	s.addCh <- c 
}
func (s *Server) RecieveMessage(msg *Message) {
	s.messageCh <- msg
}
func (s *Server) Del(c *Client) {
	s.delCh <- c 
}
func (s *Server) Done() {
	s.doneCh <- true 
}
func (s *Server) Err(err error) {
	s.errCh <- err 
}

// Internal Server functions -- when items get off the channels
/* send msg to all the clients */
func (s *Server) sendAll(msg *Message) {
	for cId, c := range s.clients {
		if (cId != msg.Client) {
			c.Write(msg)
		}
	}
}
func (s *Server) sendErrorMessage(cId int) {
	msg := ErrorMessage(cId)
	s.clients[cId].Write(msg)
}



// when troll client recieves message, sends the IncomingMessage to server to be handled
func (s *Server) recieveMessage(msg *Message) {
	switch msg.Type {
		
		case "MOVE":
			client 	 := s.clients[msg.Client]
			hotspots := msg.Hotspots

			gId 	 := client.grid
			grid, ok := s.gridMap[gId]
			if (!ok) {
				grid = NewGrid(gId)
				s.gridMap[gId] = grid
				log.Println("Added grid", gId)
			}
			entered  := grid.HandleMove(hotspots)
			client.cell = entered
			
			if hotspots := grid.UpdateHotspots(); (hotspots != nil) {
				msg := NewUpdateMessage(hotspots)
				s.sendAll(msg)
			}

		default:
			log.Println("Unknown message type recieved: ", msg.Type)
	}
}
func (s *Server) addClientConnection(c *Client) {
	cId := c.id
	s.clients[cId] = c


	log.Println("added client - Now", len(s.clients), "clients connected.")
}
func (s *Server) deleteClientConnection(c *Client) {
	/* If this is the last client in the Grid, then delete */
	gId  := c.grid
	grid := s.gridMap[gId]
	grid.Decrement(c.cell)

	cId := c.id
	delete(s.clients, cId)

	if hotspots := grid.UpdateHotspots(); (hotspots != nil) {
		msg := NewUpdateMessage(hotspots)
		s.sendAll(msg)
	}

	if grid.Empty() {
		delete(s.gridMap, gId)
	}
	log.Println("Removed client - Now", len(s.clients), "clients connected.")
}


// Listen and serve - serves client connection and broadcast request.
func (s *Server) Listen() {
	log.Println("Server listening........")

	// websocket handler
	onConnect := func(ws *websocket.Conn) {
		log.Println("\nNew Connection Request on Grid:", ws.Request().URL.Query()["grid"][0])
		gridID, err := strconv.Atoi(ws.Request().URL.Query()["grid"][0])
		if err != nil {
			return
		}

		defer func() {
			err := ws.Close()
			if err != nil {
				s.errCh <- err
			}
		}()

		client := NewClient(ws, s, gridID)
		s.AddClientConnection(client)
		client.Listen()
	}
	http.Handle(NEW_CONNECTION_ENDPOINT, websocket.Handler(onConnect))

	for {
		select {

			// Add new a client
			case c := <-s.addCh:
				s.addClientConnection(c)

			// del a client
			case c := <-s.delCh:
				s.deleteClientConnection(c)

			// recieve a message from a client
			case msg := <-s.messageCh:
				s.recieveMessage(msg)

			case err := <-s.errCh:
				log.Println("Error:", err.Error())

			case <-s.doneCh:
				return
		}
	}
}





























