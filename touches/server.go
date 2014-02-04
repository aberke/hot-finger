package touches

import (
        "log"
        "net/http"
        //"strconv"

        "code.google.com/p/go.net/websocket"
)

const NEW_CONNECTION_ENDPOINT = "/connect"

type Server struct {
	clients 	map[int]*Client
	addCh		chan *Client
	delCh		chan *Client
	messageCh 	chan *Message
	doneCh		chan bool
	errCh		chan error
}

// Create new Server
func NewServer() *Server {
	clients 		:= make(map[int]*Client)

	addCh 				:= make(chan *Client)
	delCh 				:= make(chan *Client)
	messageCh 			:= make(chan *Message)
	doneCh 				:= make(chan bool)
	errCh 				:= make(chan error)
	return &Server{
		clients,
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


func (s *Server) recievePingMessage(cID int) {
	var msg *Message
	msg = OutgoingPingMessage(cID)
	s.clients[cID].Write(msg)
}


// when troll client recieves message, sends the IncomingMessage to server to be handled
func (s *Server) recieveMessage(msg *Message) {
	log.Println("incoming msg: ", msg)
	s.sendAll(msg)
	// switch msg.Type {
	// case "ping":
	// 	s.recievePingMessage(msg.LocalTroll)
	// case "items":
	// 	s.recieveItemsMessage(msg.LocalTroll)
	// case "message":
	// 	s.recieveMessageMessage(msg.LocalTroll, msg.Data)
	// case "move":
	// 	s.recieveMoveMessage(msg.LocalTroll, msg.Data)
	// default:
	// 	log.Println("Unknown message type recieved: ", msg.Type)
	// }
}
func (s *Server) addClientConnection(c *Client) {
	cId := c.id
	s.clients[cId] = c

	log.Println("added client - Now", len(s.clients), "clients connected.")
}
func (s *Server) deleteClientConnection(c *Client) {
	cId := c.id
	delete(s.clients, cId)

	msg := DeleteMessage(cId)
	s.sendAll(msg)
	log.Println("Removed client - Now", len(s.clients), "clients connected.")
}

// Listen and serve - serves client connection and broadcast request.
func (s *Server) Listen() {
	log.Println("Server listening........")

	// websocket handler
	onConnect := func(ws *websocket.Conn) {
		defer func() {
			err := ws.Close()
			if err != nil {
				s.errCh <- err
			}
		}()

		client := NewClient(ws, s)
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





























