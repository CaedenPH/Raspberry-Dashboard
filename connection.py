from __future__ import annotations

import aiohttp
import asyncio
import json


class DisconnectError(Exception):
    """Raised when the websocket is forcebly disconnected from the server."""


class WebSocket:
    REQUEST = 0
    RESPONSE = 1
    IDENTIFY = 2

    def __init__(self, ws: aiohttp.ClientWebSocketResponse, client: Client) -> None:
        self.socket = ws
        self.client = client

    async def identify(self) -> None:
        with open("config.json") as stream:
            data: dict = json.load(stream)

        await self.socket.send_json({
            "op": self.IDENTIFY, 
            "token": data.get("ws_token")
        })
    
    async def listen(self) -> None:
        await self.identify()
        async for message in self.socket:
            print(message)
        raise DisconnectError


    @classmethod
    async def connect(cls, client: Client) -> WebSocket:
        ws = await client._session.ws_connect("ws://localhost:8080")
        return cls(ws, client)


class Client:
    def __init__(self) -> None:
        self._session = aiohttp.ClientSession()
    
    async def ws_connect(self) -> WebSocket | bool:
        try:
            self._ws = await WebSocket.connect(self)
            return self._ws
        except aiohttp.ClientConnectionError:
            return False


async def main() -> None:
    client = Client()

    while True:
        connection = await client.ws_connect()
        if connection is not False:
            try:
                await connection.listen()
            except DisconnectError:
                continue
                
        
asyncio.run(main())