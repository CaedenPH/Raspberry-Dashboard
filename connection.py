import aiohttp
import asyncio

async def main() -> None:
    client = aiohttp.ClientSession()
    connection = await client.ws_connect("ws://localhost:8080")
    async for message in connection:
        print(message)

asyncio.run(main())