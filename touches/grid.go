package touches

import (
        //"strconv"
        "time"
        "fmt"
        "log"
        "code.google.com/p/go.net/websocket"
)

// send an update 4 times each second
const UPDATE_INTERVAL = time.Second/4 

/* The Grid has
    id    -- corresponds to the page the grid is on
    cells -- maps cellID to heat.  Like a sparse array
*/
type Grid struct {
    id              int
    server          *Server
    clients         map[int]*Client
    cells           map[string]int // maps cellID to heat (cellID is a string rep of an integer)
    nextUpdate      time.Time

    addCh           chan *Client
    delCh           chan *Client
    messageCh       chan *Message
    doneCh          chan bool
    errCh           chan error
}    
func NewGrid(gId int, s *Server) *Grid {
    clients     := make(map[int]*Client)
    cells       := make(map[string]int) // map rather than an array to keep it sparse
    nextUpdate  := time.Now()

    addCh           := make(chan *Client)
    delCh           := make(chan *Client)
    messageCh       := make(chan *Message)
    doneCh          := make(chan bool)
    errCh           := make(chan error)

    return &Grid{ 
                gId,
                s, 
                clients, 
                cells, 
                nextUpdate,

                addCh,
                delCh,
                messageCh,
                doneCh,
                errCh,
            }
}

/* ------------------------------------------------
        Channel Functions Below
------------------------------------------------- */
func (g *Grid) AddConnection(ws *websocket.Conn) {
    c := NewClient(ws, g)
    g.addCh <- c 
    c.Listen()
}
func (g *Grid) RecieveMessage(msg *Message) {
    g.messageCh <- msg
}
func (g *Grid) Del(c *Client) {
    g.delCh <- c 
}
func (g *Grid) Done() {
    g.doneCh <- true 
}
func (g *Grid) Err(err error) {
    g.errCh <- err 
}
/* ------------------------------------------------
        Channel Functions Above
------------------------------------------------- */

func (g *Grid) Empty() bool{
    if (len(g.cells) > 0) {
        return true
    }
    return false
}
func (g *Grid) updateHotspots() map[string]int {
    /* Returns cells if it's ready to update.  Otherwise returns nil */
    now := time.Now()
    if now.After(g.nextUpdate) {
        g.nextUpdate = now.Add(UPDATE_INTERVAL)
        return g.cells
    }
    return nil
}

func (g *Grid) handleMove(hotspots map[string]int) string {
    /* Handles Hotspots from Client message.
        Returns the spot that the Client should set its cell field to.
    */
    fmt.Println("HandleMove with hotspots", hotspots)
    cell := ""
    for cellID, val := range hotspots {

        if (val > 0) {
            cell = cellID
        }
        heat, ok := g.cells[cellID]

        if (!ok) {
            g.cells[cellID] = val
        } else {
            g.cells[cellID] = heat + val
        }

        if (g.cells[cellID] <= 0) {
            delete(g.cells, cellID)
        }
    }
    return cell
}

func (g *Grid) decrement(cellID string) {
    /* decrements heat value in cell.  Maintains sparsity by deleting cell from map if value <= 0 */
    if heat, ok := g.cells[cellID]; ok {
        newHeat := heat - 1
        if (newHeat > 0) {
            g.cells[cellID] = newHeat
        } else {
            delete(g.cells, cellID)
        }
    }
}
/* send msg to all the clients */
func (g *Grid) sendAll(msg *Message) {
    for cId, c := range g.clients {
        if (cId != msg.Client) {
            c.Write(msg)
        }
    }
}
func (g *Grid) sendErrorMessage(cId int) {
    msg := ErrorMessage(cId)
    g.clients[cId].Write(msg)
}



func (g *Grid) recieveMessage(msg *Message) {
    switch msg.Type {
        
        case "MOVE":
            client   := g.clients[msg.Client]
            hotspots := msg.Hotspots

            entered  := g.handleMove(hotspots)
            client.cell = entered

            if hotspots := g.updateHotspots(); (hotspots != nil) {
                msg := NewUpdateMessage(hotspots)
                g.sendAll(msg)
            }

        default:
            log.Println("Unknown message type recieved: ", msg.Type)
    }
}
func (g *Grid) addClientConnection(c *Client) {
                log.Println("2")
    cId := c.id
    g.clients[cId] = c

    log.Println("added client to Grid", g.id, " - Now", len(g.clients), " clients connected.")
}
func (g *Grid) deleteClientConnection(c *Client) {
    /* If this is the last client in the Grid, then delete */
    g.decrement(c.cell)
    delete(g.clients, c.id)

    if hotspots := g.updateHotspots(); (hotspots != nil) {
        msg := NewUpdateMessage(hotspots)
        g.sendAll(msg)
    }

    log.Println("Removed client from Grid", g.id, " - Now", len(g.clients), "clients connected.")
}


func (g *Grid) Run() { 
    log.Println("Grid", g.id, " running...")  
    for {
        select {

            // Add new a client
            case c := <-g.addCh:
                g.addClientConnection(c)

            // del a client
            case c := <-g.delCh:
                g.deleteClientConnection(c)

            // recieve a message from a client
            case msg := <-g.messageCh:
                g.recieveMessage(msg)

            case err := <-g.errCh:
                log.Println("Error:", err.Error())
                g.server.Err(err)

            case <-g.doneCh:
                log.Println("Grid", g.id, " is all done...")
                return
        }
    }
}






