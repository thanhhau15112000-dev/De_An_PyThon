import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://hau:hau@cluster0.n1rdx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    db = client['de_an_python']
    count = await db['watchlist'].count_documents({'email': 'thanhhau15112000@gmail.com'})
    print('Count:', count)
    items = await db['watchlist'].find({'email': 'thanhhau15112000@gmail.com'}).to_list(length=100)
    for item in items:
        print(item.get('product_name'), item.get('url'))

asyncio.run(main())
