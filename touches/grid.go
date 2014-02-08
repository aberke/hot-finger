package touches

import (
        //"strconv"
        "time"
        "fmt"
        // "os"
        // "encoding/json"
)

const UPDATE_INTERVAL = time.Second

/* The Grid has
    id    -- corresponds to the page the grid is on
    cells -- maps cellID to heat.  Like a sparse array
*/
type Grid struct {
    id              int
    cells           map[string]int // maps cellID to heat (cellID is a string rep of an integer)
    nextUpdate      time.Time
}    
func NewGrid(gId int) *Grid {
    cells       := make(map[string]int) // map rather than an array to keep it sparse
    nextUpdate  := time.Now()
    return      &Grid{ gId, cells, nextUpdate }
}

func (g *Grid) Empty() bool{
    if (len(g.cells) > 0) {
        return true
    }
    return false
}
func (g *Grid) UpdateHotspots() map[string]int {
    /* Returns cells if it's ready to update.  Otherwise returns nil */
    now := time.Now()
    if now.After(g.nextUpdate) {
        g.nextUpdate = now.Add(UPDATE_INTERVAL)
        return g.cells
    }
    return nil
}

func (g *Grid) HandleMove(hotspots map[string]int) string {
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

func (g *Grid) Decrement(cellID string) {
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









