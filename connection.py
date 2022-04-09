from __future__ import annotations

import aiohttp
import asyncio
import datetime
import json
import math

import time
import psutil
import speedtest
import subprocess


class DisconnectError(Exception):
    """ Raised when the websocket is forcebly disconnected from the server. """


class ResponseHandler:
    """
    Handles responses from the websocket
    connection and generates system information 
    related respponses. Also exeuctes commands 
    in shell as a response.
    """
    
    @staticmethod
    def base(self) -> dict[any, any]:
        """
        Generates the systeminformation 
        required for the base / path.
        """
        
        with open("logs.txt") as logs:
            lines = [
                dict(
                    zip(["ping", "download", "upload"], [line[0], line[1], line[2] * 10])
                )
                for line in [
                    [float(i) for i in l.strip().split(" | ")] for l in logs.readlines()
                ]
            ]

        uptime_seconds = time.time() - psutil.boot_time()
        d, h, m, s = map(
            math.floor,
            [
                uptime_seconds / 86400,
                uptime_seconds % 86400 / 3600,
                uptime_seconds % 3600 / 60,
                uptime_seconds % 60,
            ],
        )

        stdout = (
            subprocess.run(
                ["cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq"],
                stdout=subprocess.PIPE,
                shell=True,
            )
            .stdout.decode("utf-8")
            .strip()
            .split("\n")
        )

        response = {
            "general": {
                "uptimeHours": round((uptime_seconds) / 3600, 2),
                "uptimeLong": f"{d} days, {h} hours, {m} minutes and {s} seconds.",
                "hourSeconds": datetime.datetime.now().strftime("%H:%M"),
                "longDatetime": datetime.datetime.now().strftime("%c"),
            },
            "cpu": {
                # "temp": [psutil.sensors_temperatures().get("cpu_thermal")[0].current],
                "currentSpeed": json.dumps(
                    list(map(lambda m: round(int(m) / 1000000), stdout))
                ),
            },
            "network": {
                "ping": lines[-1].get("ping"),
                "pingDifference": "+" + str(diff)
                if (diff := round(lines[-1].get("ping") / lines[-2].get("ping"), 3)) > 1
                else f"-{lines[-2].get('ping') / lines[-1].get('ping')}",
                "download": [lines[-i].get("download") for i in range(1, 8)],
                "upload": [lines[-i].get("upload") for i in range(1, 8)],
            },
            "memory": {
                "used": round(psutil.virtual_memory().used * (9.31 * 10 ** -10), 1),
                "available": round(
                    psutil.virtual_memory().available * (9.31 * 10 ** -10), 1
                ),
            },
        }
        return response


class WebSocket:
    """
    Handles websocket responses.
    
    Attributes
    ----------
    REQUEST :receive:
        OPCode indicating a response request.
    RESPONSE :deliver:
        OPCode sent with a response.
    IDENTIFY :receive&deliver:
        OPCode sent with the payload request/ack.
    ws: :class:`aiohttp.ClientWebSocketResponse`
        The socket instance connected with the server.
    client: :class:`Client`
        The client handling requests.
    """
    
    REQUEST = 0
    RESPONSE = 1
    IDENTIFY = 2

    def __init__(self, ws: aiohttp.ClientWebSocketResponse, client: Client) -> None:
        self.socket = ws
        self.client = client

    async def _parse_message(self, message: str) -> None:
        data: dict = json.loads(message)
        if data.get("op") == self.REQUEST:
            __converter = {"/": ResponseHandler.base}
            response = __converter.get(data.get("d"))()
            await self.socket.send_json({"op": self.RESPONSE, "d": response})

    async def identify(self) -> None:
        """ Sends the identify payload. """
        
        with open("config.json") as stream:
            data: dict = json.load(stream)
        await self.socket.send_json({"op": self.IDENTIFY, "token": data.get("ws_token")})

    async def listen(self) -> None:
        """ Listens for messages from the server. """
       
        await self.identify()
        async for message in self.socket:
            await self._parse_message(message.data)
        raise DisconnectError # connection disconnected

    @classmethod
    async def connect(cls, client: Client) -> WebSocket:
        """
        Creates a connection between the client
        and the server.
        
        Parameters
        ----------
        client :class:`Client`
            The client that handles websocket
            connection and interaction.
        """

        with open("config.json") as stream:
            data: dict = json.load(stream)

        ws = await client._session.ws_connect(f"ws://{data.get('ws_path')}")
        return cls(ws, client)


class Client:
    """
    Handles websocket creation
    and connection.
    
    Attributes
    ----------
    _session: :class:`aiohttp.ClientSession`
        The raw client session.
    """

    def __init__(self) -> None:
        self._session = aiohttp.ClientSession()

    async def ws_connect(self) -> WebSocket | bool:
        """
        Creates the websocket connection.

        Returns
        -------
        Union[Websocket, bool]
            websocket instance or False
            indicating a failed connection.
        """

        try:
            self._ws = await WebSocket.connect(self)
            return self._ws
        except aiohttp.ClientConnectionError:
            return False


async def main() -> None:
    """
    Initiates the websocket and starts listening
    to messages ensuring the websocket is connected.
    If disconnected, a whle True loop checks consistently
    for a reopened socket.
    """
    
    client = Client()

    while True:
        connection = await client.ws_connect()
        if connection is not False:
            try:
                await connection.listen()
            except DisconnectError:
                continue

async def update_logs() -> None:
    """
    Simulates a crontab-like funcion
    to update the logs.txt function every
    hour with the latest network speeds.
    """

    while True:
        network = speedtest.Speedtest()
        upload: int = network.upload()
        download: int = network.download()
        ping: dict = network.get_best_server()

        with open("logs.txt", "w") as logs:
            logs.write(f"{ping.get('latency')} | {download} | {upload}")
        await asyncio.sleep(3600)
    


asyncio.run(update_logs())
asyncio.run(main())
