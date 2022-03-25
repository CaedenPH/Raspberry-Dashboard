import platform
import psutil
import re
import uuid
import socket

from NetworkStatisticsService.statistics_service import StatisticsService
from datetime import datetime

from django.core.handlers import wsgi
from django.http import HttpResponse


with open("./index.html") as stream:
    HTML_SCRIPT = stream.read()


class Response:
    def __init__(self, request: wsgi.WSGIRequest) -> None:
        self.request = request
        self.sys_info = self.get_system_info()
        # self.network_info = self.get_network_info()

    def to_html(self) -> str:
        return HTML_SCRIPT.format()

    def get_uptime(self) -> str:
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        delta_uptime = datetime.utcnow() - boot_time

        (hours, remainder) = divmod(int(delta_uptime.total_seconds()), 3600)
        (minutes, seconds) = divmod(remainder, 60)
        (days, hours) = divmod(hours, 24)

        return f"{days} days, {hours} hours, {minutes} minutes, and {seconds} seconds"

    def get_system_info(self) -> dict:
        system_info = {
            "platform": platform.system(),
            "platform-release": platform.release(),
            "platform-version": platform.version(),
            "architecture": platform.machine(),
            "hostname": socket.gethostname(),
            "ip-address": socket.gethostbyname(socket.gethostname()),
            "mac-address": ":".join(re.findall("..", "%012x" % uuid.getnode())),
            "processor": platform.processor(),
            "ram": str(round(psutil.virtual_memory().total / (1024.0 ** 3))) + " GB",
            "disk_usage": psutil.disk_usage("/"),
            "cpu_count": psutil.cpu_count(),
            "cpu_usage": psutil.cpu_percent(),
            "users": psutil.users(),
            "current_time": datetime.utcnow(),
            "uptime": self.get_uptime(),
            "average_load": psutil.getloadavg(),
        }
        print(system_info)
        return system_info

    def get_network_info(self) -> dict:
        statistics_service = StatisticsService()
        stats = statistics_service.generate_statistics()
        print(stats)
        return stats


def index(request: wsgi.WSGIRequest) -> HttpResponse:
    response = Response(request)
    html = response.to_html()
    return HttpResponse(html)


index(1)
