package touches

import (
        "log"
        "net/http"
        "strconv"

        "code.google.com/p/go.net/websocket"
)

const NEW_CONNECTION_ENDPOINT = "/connect"

type Server struct {
	gridMap			map[int]*Grid // grids are like chat rooms
	
	addCh			chan *Grid
	delCh			chan *Grid
	messageCh 		chan *Message
	doneCh			chan bool
	errCh			chan error
}

// Create new Server
func NewServer() *Server {
	/* Server starts off with no Grids
		Grids are added and removed based on clients connecting/disconnecting */
	gridMap 		:= make(map[int]*Grid)

	addCh 			:= make(chan *Grid)
	delCh 			:= make(chan *Grid)
	messageCh 		:= make(chan *Message)
	doneCh 			:= make(chan bool)
	errCh 			:= make(chan error)
	return &Server{
		gridMap,
		addCh,
		delCh,
		messageCh,
		doneCh,
		errCh,
	}
}


func (s *Server) Del(g *Grid) {
	s.delCh <- g
}
func (s *Server) Done() {
	s.doneCh <- true 
}
func (s *Server) Err(err error) {
	s.errCh <- err 
}



// Listen and serve - serves client connection and broadcast request.
func (s *Server) Listen() {
	log.Println("Server listening........")

	// websocket handler
	onConnect := func(ws *websocket.Conn) {
		log.Println("0")
		defer func() {
			err := ws.Close()
			if err != nil {
				s.errCh <- err
			}
		}()
		gId, err := strconv.Atoi(ws.Request().URL.Query()["grid"][0])
		if err != nil {
			return
		}

        g, ok := s.gridMap[gId]
        if (!ok) {
            g = NewGrid(gId, s)
            s.gridMap[gId] = g
            go g.Run()
        }
		g.AddConnection(ws)
	}
	http.Handle(NEW_CONNECTION_ENDPOINT, websocket.Handler(onConnect))

	for {
		select {

			// Add new a grid
			case g := <-s.addCh:
				log.Println("TODO? s.addGridConnection(g)", g)
				//s.addGridConnection(g)

			// del a grid
			case g := <-s.delCh:
				log.Println("TODO? s.deleteGridConnection(g)", g)
				//s.deleteGridConnection(g)

			// recieve a message from a client ?
			case msg := <-s.messageCh:
				log.Println("Server recieved message: ", msg)

			case err := <-s.errCh:
				log.Println("Error:", err.Error())

			case <-s.doneCh:
				return
		}
	}
}





























