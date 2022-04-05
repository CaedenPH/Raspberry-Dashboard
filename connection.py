from __future__ import annotations

import aiohttp
import asyncio
import datetime
import json
import math

import time
import psutil
import subprocess


class DisconnectError(Exception):
    """Raised when the websocket is forcebly disconnected from the server."""


class ResponseHandler:
    def __init__(self) -> None:
        pass

    def generate_base(self) -> dict[any, any]:
        with open("logs.txt") as logs:
            lines = [
                dict(zip(["ping", "download", "upload"], [line[0], line[1], line[2]]))
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

        response = {
            "general": {
                "uptimeHours": round((uptime_seconds) / 3600, 2),
                "uptimeLong": f"{d} days, {h} hours, {m} minutes and {s} seconds.",
                "hourSeconds": datetime.datetime.now().strftime("%H:%M"),
                "longDatetime": datetime.datetime.now().strftime("%c"),
            },
            "cpu": {
                # "temp": [psutil.sensors_temperatures().get("cpu_thermal")[0].current],
                "currentSpeed": subprocess.run(
                    ["cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq"],
                    stdout=subprocess.PIPE,
                    shell=True,
                )
                .stdout.decode("utf-8")
                .strip()
                .split("\n")
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
                "used": round(psutil.virtual_memory().used * (9.31 * 10 ** -10), 3),
                "available": round(
                    psutil.virtual_memory().available * (9.31 * 10 ** -10), 3
                ),
            },
        }
        return response


class WebSocket:
    REQUEST = 0
    RESPONSE = 1
    IDENTIFY = 2

    def __init__(self, ws: aiohttp.ClientWebSocketResponse, client: Client) -> None:
        self.socket = ws
        self.client = client
        self.response_handler = ResponseHandler()

    async def _parse_message(self, message: str) -> None:
        data: dict = json.loads(message)
        if data.get("op") == self.REQUEST:
            __converter = {"/": self.response_handler.generate_base()}
            response = __converter.get(data.get("d"))
            await self.socket.send_json({"op": self.RESPONSE, "d": response})

    async def identify(self) -> None:
        with open("config.json") as stream:
            data: dict = json.load(stream)

        await self.socket.send_json(
            {"op": self.IDENTIFY, "token": data.get("ws_token")}
        )

    async def listen(self) -> None:
        await self.identify()
        async for message in self.socket:
            await self._parse_message(message.data)
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
