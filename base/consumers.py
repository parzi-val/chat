import json
from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import Message
from django.contrib.auth.models import User


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print(f"Connecting user: {self.scope['user']} to recipient: {self.scope['url_route']['kwargs']['recipient_id']}")
        # Authenticate user
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Get recipient ID from URL
        self.recipient_id = self.scope['url_route']['kwargs']['recipient_id']

        # Validate recipient exists
        if not await self.recipient_exists():
            await self.close(code=4004)
            return

        # Create a unique room name for the two users
        self.room_group_name = self.get_room_name(self.user.id, self.recipient_id)

        # Add the user to the group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

    @database_sync_to_async
    def recipient_exists(self):
        return User.objects.filter(id=self.recipient_id).exists()

    def get_room_name(self, user1_id, user2_id):
        # Use sorted IDs to create consistent room names
        sorted_ids = sorted([str(user1_id), str(user2_id)])
        return f"chat_{'_'.join(sorted_ids)}"

    async def disconnect(self, close_code):
        # Remove the user from the group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get('message')
        print(data)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get('message')
        print(data)

        if data["type"] == "message":
            # Save the message and get the created instance
            saved_message = await self.save_message(self.user.id, self.recipient_id, message)
            timestamp = saved_message.timestamp.isoformat()  # Convert to ISO format for JSON compatibility

            # Broadcast the message to the group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender_id': self.user.id,
                    'timestamp': timestamp,
                }
            )

    @database_sync_to_async
    def save_message(self, sender_id, recipient_id, content):
        sender = User.objects.get(id=sender_id)
        recipient = User.objects.get(id=recipient_id)
        return Message.objects.create(sender=sender, receiver=recipient, message=content)


    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(json.dumps({
            'message': event['message'],
            'sender_id': event['sender_id'],
            'timestamp': str(event['timestamp'])
        }))
