package touches

import (
	//"fmt"
)



type Message struct {
	Type 		string `json:"Type"`
	Data   		map[string]string `json:"Data"`
	Client 		int
}


func NewMessage(msgType string, data map[string]string, client int) *Message {
	return &Message{
		msgType,
		data,
		client,
	}
}
func ErrorMessage(client int) *Message {
	return NewMessage("error", nil, client)
}

func OutgoingPingMessage(client int) *Message {
	return NewMessage("ping", nil, client)
}
func DeleteMessage(client int) *Message {
	return NewMessage("DELETE", nil, client)
}

