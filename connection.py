from __future__ import annotations

import asyncio
import datetime
import json
import math
import sys
import time
import traceback
from typing import Any, Awaitable

import aiohttp
import aiosqlite
import cpuinfo  # type: ignore
import distro  # type: ignore
import psutil
import speedtest

with open("config.json") as config:
    data: dict[str, Any] = json.load(config)

JESTERBOT_PATH = data.get("jesterbot_path", "/home/pi/jesterbot/")
PIZZAHAT_PATH = data.get("pizzahat_path", "/home/pi/pizzahat/")
DISK_PATH = data.get("disk_path", "/dev/mmcblk0p2")
PROCESSES = ["jesterbot", "pizzahat", "stealthybot", "raspberry-dashboard"]
CRITICAL_LOG = """\
CRITICAL ERROR
--------------
TIME : {time}
NETWORK_ONLINE : {network}
ERROR : {error}
TYPE : {error_type}
TRACRBACK : {traceback}
---------------
BACKUP INITIATED
"""


async def execute(command: str) -> tuple[str]:
    """
    Asynchronously executes a command as a
    subprocess shell.

    Parameters
    ----------
    command: :class:`str`
        The command to execute

    Returns
    -------
    `tuple[str]`
        The output with stdout being at index
        0 and stderr being at index 1.
    """
    proc = await asyncio.create_subprocess_shell(
        command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    return tuple(map(lambda m: m.decode("utf-8").strip(), await proc.communicate()))


class DisconnectError(Exception):
    """Raised when the websocket is forcibly disconnected from the server."""


class ResponseHandler:
    """
    Handles responses from the websocket
    connection and generates system information
    related respponses. Also exeuctes commands
    in shell as a response.
    """

    async def fetch_cpu_usage(self, status: str) -> float:
        try:
            main_pid = status[status.index("PID:") + 1]
            return round(float((await execute(f"ps --noheader -p {main_pid} -o %cpu"))[0]))
        except ValueError:
            return 0

    async def fetch_process_status(self, unit: str) -> dict[str, str]:
        stdout: str = (await execute(f"systemctl status {unit}.service"))[0].split()

        return {
            "stdout": stdout,
            "status": stdout[stdout.index("Active:") + 1].capitalize(),
            "uptime": "Unable to find",  # TODO: Fix
        }

    async def home(self, verified: bool) -> dict[str, Any]:
        """
        Generates the systeminformation
        required for the base / path.

        Parameters
        ----------
        verified: :class:`bool`
            Whether or not the user is
            logged in.

        Returns
        -------
        `dict[str, Any]`
            The response generated.
        """

        with open("logs/network.txt") as logs:
            lines = [
                dict(zip(["ping", "download", "upload"], [line[0], line[1], line[2] * 10]))
                for line in [
                    [float(i) for i in _line.strip().split(" | ") if ":" not in i] for _line in logs.readlines()
                ]
            ]

        uptime_seconds = time.time() - psutil.boot_time()
        d, h, m = map(math.floor, [uptime_seconds / 86400, uptime_seconds % 86400 / 3600, uptime_seconds % 3600 / 60])

        logins = {}
        numbers = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six"}
        for iteration, login in enumerate(
            [_login for _login in (await execute("last"))[0].splitlines() if "pts" in _login][:6]
        ):
            logins[numbers[iteration + 1]] = {"date": " ".join(login.split()[3:]).split("-")[0]}

        processes = {}
        for unit in PROCESSES:
            process_status = await self.fetch_process_status(unit)
            processes[unit.replace("raspberry-", "")] = {
                "status": process_status["status"],
                "uptime": process_status["uptime"],
                "cpu_usage": await self.fetch_cpu_usage(process_status["stdout"]),
            }

        response = {
            "general": {
                "uptimeHours": round((uptime_seconds) / 3600),
                "uptimeLong": f"{d} days, {h} hours and {m} minutes.",
                "labels": json.dumps(
                    list(
                        map(
                            lambda i: (datetime.datetime.utcnow() - datetime.timedelta(hours=i)).strftime("%H:%M"),
                            range(7),
                        )
                    )
                ),
                "hourSeconds": datetime.datetime.now().strftime("%H:%M"),
                "longDatetime": datetime.datetime.now().strftime("%c"),
            },
            "cpu": {
                "temp": [psutil.sensors_temperatures().get("cpu_thermal")[0].current],  # type: ignore
                "currentSpeed": json.dumps(
                    list(
                        map(
                            lambda m: round(int(m) / 1000000),
                            (await execute("cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq"))[0].split("\n"),
                        )
                    )
                ),
            },
            "network": {
                "ping": round(lines[-1].get("ping")),
                "pingDifference": "+" + str(diff)
                if (diff := round(lines[-1].get("ping") / lines[-2].get("ping"), 2)) > 1
                else f"-{round(lines[-2].get('ping') / lines[-1].get('ping'), 2)}",
                "download": [round(lines[-i].get("download") / 1000000) for i in range(1, 8)],
                "upload": [round(lines[-i].get("upload") / 1000000) for i in range(1, 8)],
            },
            "memory": {
                "used": round(psutil.virtual_memory().used * (9.31 * 10 ** -10), 1),
                "available": round(psutil.virtual_memory().available * (9.31 * 10 ** -10), 1),
            },
            "login": {**logins},
            **processes,
        }
        return response

    async def statistics(self, verified: bool) -> dict[str, Any]:
        """
        Generates a response for the
        statistics endpoint.

        Parameters
        ----------
        verified: :class:`bool`
            Whether or not the user is
            logged in.

        Returns
        -------
        `dict[str, Any]`
            The response generated.
        """

        cpu = cpuinfo.get_cpu_info()
        response = {
            "cpu": cpu,
            "os": {"name": distro.id().capitalize(), "processes": (await execute("ps aux | wc -l"))[0]},
            "internet": {
                "private": (await execute("hostname -i"))[0],
                "public": (await execute("curl ifconfig.me."))[0] if verified else "*** *** ***",
            },
        }
        return response

    async def jesterbot(self, verified: bool) -> dict[str, Any]:
        """
        Generates a response for  the
        jesterbot endpoint.

        Parameters
        ----------
        verified: :class:`bool`
            Whether or not the user is
            logged in.

        Returns
        -------
        `dict[str, Any]`
            The response generated.
        """

        async with aiosqlite.connect(JESTERBOT_PATH + "/db/database.db") as db:
            total_commands = await (await db.execute("SELECT score FROM overall_score")).fetchone()
            date, ping, bot_users, guilds, channels, disnake_version = (
                await (await db.execute("SELECT * FROM general_data")).fetchall()
            )[-1]

        process_status = await self.fetch_process_status("jesterbot")
        status = process_status["status"]
        uptime = process_status["uptime"]

        with open(JESTERBOT_PATH + "/dicts/score.json") as stream:
            data = json.load(stream)
            users = sorted(data, key=lambda u: data[u]["score"])

        with open(JESTERBOT_PATH + "/dicts/commands_used.json") as stream:
            commands_data = json.load(stream)
            commands = sorted(commands_data, key=lambda c: commands_data[c]["score"])

        return {
            "general": {"uptime": uptime, "status": status},
            "stats": {
                "create_epoch": datetime.datetime.fromisoformat(date).strftime("%c"),
                "ping": round(ping),
                "users": bot_users,
                "guilds": guilds,
                "channels": channels,
                "disnake_version": disnake_version,
            },
            "commands": {
                "total": total_commands,
                "top_one": data[users[-1]]["score"],
                "bottom_decile": sum([data[u]["score"] for u in users[:-11]]),
                "top_ten_names": [data[u]["name"] for u in users[-11:-1]],
                "top_ten_scores": json.dumps([data[u]["score"] for u in users[-11:-1]]),
                "top_ten_command_names": commands[-10:],
                "top_ten_command_uses": json.dumps([commands_data[c]["score"] for c in commands[-10:]]),
            },
        }

    async def stealthybot(self, verified: bool) -> dict[str, Any]:
        """
        Generates a response for  the
        stealthybot endpoint.

        Parameters
        ----------
        verified: :class:`bool`
            Whether or not the user is
            logged in.

        Returns
        -------
        `dict[str, Any]`
            The response generated.
        """
        return {}

    async def pizzahat(self, verified: bool) -> dict[str, Any]:
        """
        Generates a response for  the
        pizzahat endpoint.

        Parameters
        ----------
        verified: :class:`bool`
            Whether or not the user is
            logged in.

        Returns
        -------
        `dict[str, Any]`
            The response generated.
        """

        process_status = await self.fetch_process_status("pizzahat")
        status = process_status["status"]

        return {
            "general": {"status": status},
        }        

    async def dashboard(self, verified: bool) -> dict[str, Any]:
        """
        Generates a response for  the
        dashboard endpoint.

        Parameters
        ----------
        verified: :class:`bool`
            Whether or not the user is
            logged in.

        Returns
        -------
        `dict[str, Any]`
            The response generated.
        """

        process_status = await self.fetch_process_status("raspberry-dashboard")
        status = process_status["status"]
        uptime = process_status["uptime"]

        return {"general": {"status": status, "uptime": uptime}}

    async def storage(self, verified: bool) -> dict[str, Any]:
        """
        Generates a response for the
        storage endpoint.

        Parameters
        ----------
        verified: :class:`bool`
            Whether or not the user is
            logged in.

        Returns
        -------
        `dict[str, Any]`
            The response generated.
        """

        processes = {}
        for process in PROCESSES:
            output = (await execute(f"du -s -h ../{process}"))[0]
            processes[process.replace("raspberry-", "")] = float(output.split()[0][:-1])

        storage = (await execute(f"df -h {DISK_PATH}"))[0].split("\n")[1].split()
        total = dict(
            zip(
                ["size", "used", "available", "use"],
                [(s := storage[m]) + ("B" if s.endswith("G") else "") for m in range(1, 5)],
            )
        )
        return {"total": {**total}, **processes}

    async def messages(self, verified: bool) -> dict[str, Any]:
        with open("logs/messages.txt") as messages:
            content = messages.read()
        return {"messages": content}

    async def network(self, verified: bool) -> dict[str, Any]:
        with open("logs/network.txt") as network:
            content = network.read()
        return {"network": content}


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
    HEARTBEAT :deliver:
        OPCode sent to indicate a heartbeat to the server.
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
        self.response_handler = ResponseHandler()

    async def _log_message(self, message: str) -> None:
        with open("logs/messages.txt", "a") as messages:
            messages.write(message + f" | {datetime.datetime.utcnow().strftime('%c')}\n")

    async def _parse_message(self, message: str) -> None:
        await self._log_message(message)

        data: dict = json.loads(message)
        op = data.get("op")

        if op == self.IDENTIFY:
            await self.identify()

        elif op == self.REQUEST:
            generator: Awaitable = getattr(self.response_handler, data["d"])
            verified = data.get("v", False)
            response = await generator(verified)
            await self.send_json({"op": self.RESPONSE, "d": response})

        elif op == self.EXECUTE:
            command = data.get("d")
            stdout, stderr = await execute(command)
            await self.send_json({"op": self.EXECUTE, "d": {"stdout": stdout, "stderr": stderr}})

    async def send_json(self, data: Any) -> None:
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
        except Exception:
            await self.listen(error=True)

    async def identify(self) -> None:
        """Sends the identify payload."""

        with open("config.json") as stream:
            data: dict = json.load(stream)
        await self.send_json({"op": self.IDENTIFY, "token": data.get("ws_token")})

    async def send_heartbeats(self) -> None:
        """Sends the heartbeats to keep the ws alive."""

        while not self.is_closed:
            await self.send_json({"op": self.HEARTBEAT})
            await asyncio.sleep(5)

    async def close(self) -> None:
        self.is_closed = True
        raise DisconnectError

    async def listen(self, *, error: bool = False) -> None:
        """Listens for messages from the server."""

        if error is True:
            await self.close()

        self.loop.create_task(self.send_heartbeats())
        async for message in self.socket:
            await self._parse_message(message.data)
        await self.close()  # connection disconnected

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
    loop: :class:`asyncio.AbstractEventLoop`
        The event loop of which tasks are ran
        off of.

    Parameters
    ----------
    args: :class:`list[str]`
        The args passed when running to allow
        for debug setting.
    """

    def __init__(self, args: list[str]) -> None:
        self._session = aiohttp.ClientSession()
        self.loop = asyncio.get_running_loop()

        if "debug" not in args:
            self.loop.create_task(update_logs())

    async def ws_connect(self) -> WebSocket | bool:
        """
        Creates the websocket connection.

        Returns
        -------
        `Union[Websocket, bool]`
            websocket instance or False
            indicating a failed connection.
        """

        try:
            self._ws = await WebSocket.connect(self)
            return self._ws
        except aiohttp.ClientConnectionError:
            return False

    async def __aenter__(self) -> Client:
        return self

    async def __aexit__(self, error_type, error, tb) -> bool[True]:
        await self._session.close()

        if error_type is asyncio.CancelledError:
            return

        ping = (await execute("ping -c 1 google.com"))[0]
        with open("CRITICAL.txt", "a") as critical:
            critical.write(
                CRITICAL_LOG.format(
                    time=datetime.datetime.now(),
                    network="bytes from" in ping,
                    error=error,
                    error_type=error_type,
                    traceback="".join(traceback.format_exception(error, error, error.__traceback__)),
                )
            )
        return True


async def update_logs() -> None:
    """
    Simulates a crontab-like funcion
    to update the network logs every
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

        with open("logs/network.txt", "a") as logs:
            logs.write(f"{ping.get('latency')} | {download} | {upload} | {datetime.datetime.utcnow().strftime('%c')}\n")
        await asyncio.sleep(3600)


async def main() -> None:
    """
    Initiates the websocket and starts listening
    to messages ensuring the websocket is connected.
    If disconnected, a whle True loop checks consistently
    for a reopened socket.
    """

    async with Client(sys.argv) as client:
        while True:
            connection = await client.ws_connect()
            if connection is False:
                continue

            print("Websocket connected")
            try:
                await connection.listen()
            except DisconnectError:
                print("Websocket disconnected")
                continue
            except Exception:
                print("SUBCRITICAL: ", file=sys.stderr)
                traceback.print_exc()


asyncio.run(main())
