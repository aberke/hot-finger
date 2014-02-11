package touches

import (
        "fmt"
        "io"

        "code.google.com/p/go.net/websocket"
)

const channelBufSize = 5

var maxClientId int = 0



type Client struct {
    id     int
    ws     *websocket.Conn
    grid   *Grid
    ch     chan *Message
    doneCh chan bool
    cell   string  // "" at instantiation -- string representation of integer
}
func NewClient (ws *websocket.Conn, grid *Grid) *Client {

    if ws == nil {
        panic("ws cannot be nil")
    }
    if grid == nil {
        panic("grid cannot be nil")
    }
    maxClientId++

    ch := make(chan *Message, channelBufSize)
    doneCh := make(chan bool)

    return &Client{maxClientId, ws, grid, ch, doneCh, ""}
}
func (c *Client) Grid() *Grid {
    return c.grid;
}

func (c *Client) Write (msg *Message) {
    select {
        case c.ch <- msg:
        default:
            c.grid.Del(c)
            err := fmt.Errorf("client %d is disconnected.", c.id)
            c.grid.Err(err)
    }
}

func (c *Client) Done() {
    c.doneCh <- true
}

// Listen Write and Read request via chanel
func (c *Client) Listen() {
    go c.listenWrite()
    c.listenRead()
}

// Listen write request via chanel
func (c *Client) listenWrite() {
    for {
        select {

            // send message to the client
            case msg := <-c.ch:
                websocket.JSON.Send(c.ws, msg)

            // receive done request
            case <-c.doneCh:
                c.grid.Del(c)
                c.doneCh <- true // for listenRead method
                return
        }
    }
}

// Listen read request via chanel
func (c *Client) listenRead() {
    for {
        select {

            // receive done request
            case <-c.doneCh:
                c.grid.Del(c)
                c.doneCh <- true // for listenWrite method
                return

            // read data from websocket connection
            default:
                var msg Message
                err := websocket.JSON.Receive(c.ws, &msg)
                //fmt.Println("msg--- ", msg)
                if err == io.EOF {
                    c.doneCh <- true
                } else if err != nil {
                    c.grid.Err(err)
                } else {
                    msg.Client = c.id
                    c.grid.RecieveMessage(&msg)
                }
        }
    }
}







