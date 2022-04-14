from __future__ import annotations

import aiohttp
import asyncio
import datetime
import json
import math

import cpuinfo
import distro
import psutil
import time
import speedtest


async def execute(command: str) -> asyncio.subprocess.Process:
    proc = await asyncio.create_subprocess_exec(
        *command.split(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    return tuple(map(lambda m: m.decode("utf-8").strip(), await proc.communicate()))
 

class DisconnectError(Exception):
    """Raised when the websocket is forcebly disconnected from the server."""


class ResponseHandler:
    """
    Handles responses from the websocket
    connection and generates system information
    related respponses. Also exeuctes commands
    in shell as a response.
    """

    @staticmethod
    async def base(verified: bool) -> dict[any, any]:
        """
        Generates the systeminformation
        required for the base / path.
        """

        with open("logs.txt") as logs:
            lines = [
                dict(
                    zip(
                        ["ping", "download", "upload"], [line[0], line[1], line[2] * 10]
                    )
                )
                for line in [
                    [float(i) for i in _line.strip().split(" | ")]
                    for _line in logs.readlines()
                ]
            ]

        uptime_seconds = time.time() - psutil.boot_time()
        d, h, m = map(
            math.floor,
            [
                uptime_seconds / 86400,
                uptime_seconds % 86400 / 3600,
                uptime_seconds % 3600 / 60,
            ],
        )

        stdout = (
            await execute("cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq")[0]
            .split("\n")
        )

        response = {
            "general": {
                "uptimeHours": round((uptime_seconds) / 3600),
                "uptimeLong": f"{d} days, {h} hours and {m} minutes.",
                "hourSeconds": datetime.datetime.now().strftime("%H:%M"),
                "longDatetime": datetime.datetime.now().strftime("%c"),
            },
            "cpu": {
                # "temp": [psutil.sensors_temperatures().get("cpu_thermal")[0].current],
                "currentSpeed": json.dumps(
                    list(map(lambda m: round(int(m) / 1000000), stdout))
                )
            },
            "network": {
                "ping": round(lines[-1].get("ping")),
                "pingDifference": "+" + str(diff)
                if (diff := round(lines[-1].get("ping") / lines[-2].get("ping"), 2)) > 1
                else f"-{round(lines[-2].get('ping') / lines[-1].get('ping'), 2)}",
                "download": [
                    round(lines[-i].get("download") / 1000000) for i in range(1, 8)
                ],
                "upload": [
                    round(lines[-i].get("upload") / 1000000) for i in range(1, 8)
                ],
            },
            "memory": {
                "used": round(psutil.virtual_memory().used * (9.31 * 10**-10), 1),
                "available": round(
                    psutil.virtual_memory().available * (9.31 * 10**-10), 1
                ),
            },
        }
        return response

    @staticmethod
    async def statistics(verified: bool) -> dict[any, any]:
        cpu = cpuinfo.get_cpu_info()

        response = {
            "cpu": cpu,
            "os": {
                "name": distro.id().capitalize(),
                "processes": await execute("ps aux | wc -l")[0]
            },
            "internet": {
                "private": await execute("hostname -I | awk '{print $1}'")[0],
                "public": await execute("curl ifconfig.me.")[0] if verified else "*** *** ***"
            }
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
    EXECUTE :receive&deliver:
        OPCode sent to indicate a command execution.
    ws: :class:`aiohttp.ClientWebSocketResponse`
        The socket instance connected with the server.
    client: :class:`Client`
        The client handling requests.
    """

    REQUEST = 0
    RESPONSE = 1
    IDENTIFY = 2
    EXECUTE = 3
    HEARTBEAT = 4

    def __init__(self, ws: aiohttp.ClientWebSocketResponse, client: Client) -> None:
        self.socket = ws
        self.client = client
        self.loop = client.loop
        self.is_closed = False

    async def _parse_message(self, message: str) -> None:
        data: dict = json.loads(message)
        op = data.get("op")

        if op == self.IDENTIFY:
            await self.identify()

        if op == self.REQUEST:
            __converter = {"/": ResponseHandler.base, "/statistics": ResponseHandler.statistics}
            response = await (__converter.get(data.get("d")))(data.get("v"))
            await self.send_json({"op": self.RESPONSE, "d": response})

        elif op == self.EXECUTE:
            command = data.get("d")
            stdout, stderr = await execute(command)
            await self.send_json(
                {"op": self.EXECUTE, "d": {"stdout": stdout, "stderr": stderr}}
            )

    async def send_json(self, data: any) -> None:
        """
        Sends a json payload to the socket
        with an error handler and dumping
        into json format.

        Parameters
        ----------
        data: :class:`Any`
            The data to send.
        """
        try:
            await self.socket.send_json(data)
        except Exception as err:
            print(err)

    async def identify(self) -> None:
        """Sends the identify payload."""

        with open("config.json") as stream:
            data: dict = json.load(stream)
        await self.send_json({"op": self.IDENTIFY, "token": data.get("ws_token")})

    async def send_heartbeats(self) -> None:
        """Sends the heartbeats to keep the ws alive."""

        while not self.is_closed:
            await self.send_json({"op": self.HEARTBEAT})
            await asyncio.sleep(30)

    async def listen(self) -> None:
        """Listens for messages from the server."""

        self.loop.create_task(self.send_heartbeats())
        async for message in self.socket:
            await self._parse_message(message.data)

        self.is_closed = True
        raise DisconnectError  # connection disconnected

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
        self.loop = asyncio.get_running_loop()
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


async def update_logs() -> None:
    """
    Simulates a crontab-like funcion
    to update the logs.txt function every
    hour with the latest network speeds.
    """

    while True:
        try:
            network = speedtest.Speedtest()
            upload: int = network.upload()
            download: int = network.download()
            ping: dict = network.get_best_server()
        except Exception:
            continue

        with open("logs.txt", "a") as logs:
            logs.write(f"{ping.get('latency')} | {download} | {upload}\n")
        await asyncio.sleep(3600)


async def main() -> None:
    """
    Initiates the websocket and starts listening
    to messages ensuring the websocket is connected.
    If disconnected, a whle True loop checks consistently
    for a reopened socket.
    """

    client = Client()
    client.loop.create_task(update_logs())

    while True:
        connection = await client.ws_connect()
        if connection is not False:
            print("Websocket connected")
            try:
                await connection.listen()
            except DisconnectError:
                print("Websocket disconnected")
                continue

asyncio.run(main())
