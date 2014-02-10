package touches

import (
	//"fmt"
)





type Message struct {
	Type 		string `json:"Type"`
	Hotspots   	map[string]int `json:"Hotspots"`
	Client 		int
}



func NewUpdateMessage(hotspots map[string]int) *Message {
	return NewMessage("UPDATE", hotspots, 0)
}

func NewMessage(msgType string, hotspots map[string]int, client int) *Message {
	return &Message{
		msgType,
		hotspots,
		client,
	}
}
func ErrorMessage(client int) *Message {
	return NewMessage("error", nil, client)
}

func DeleteMessage(client int) *Message {
	return NewMessage("DELETE", nil, client)
}

