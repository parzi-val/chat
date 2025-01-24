from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserSerializer
from django.contrib.auth.models import User
from rest_framework.permissions import IsAuthenticated
from .models import Message
from django.shortcuts import render

def login_view(request):
    return render(request, 'frontend/login.html')

def signup_view(request):
    return render(request, 'frontend/signup.html')

def users_view(request):
    return render(request, 'frontend/chat_room.html')

class SignupView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return Response({'message': 'Login successful'}, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
    
class UserListView(APIView):
    permission_classes = [IsAuthenticated]  # Only allow authenticated users

    def get(self, request):
        # Exclude the current user from the list
        users = User.objects.exclude(id=request.user.id)
        serializer = UserSerializer(users, many=True)
        return Response({'users': serializer.data}, status=status.HTTP_200_OK)
    
from django.contrib.auth import logout

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return JsonResponse({'status': 'success'})
    
    
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure user is logged in

    def get(self, request):
        # Return authenticated user's data
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username
        }, status=status.HTTP_200_OK)
    


class MessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        # Get messages involving the current user and the user_id
        messages = Message.objects.filter(
            sender__in=[request.user.id, user_id],
            receiver__in=[request.user.id, user_id]
        ).order_by('timestamp')

        # Serialize the messages
        serialized_messages = [
            {
                "id": msg.id,
                "content": msg.message,
                "sender": msg.sender.id,
                "receiver": msg.receiver.id,
                "timestamp": msg.timestamp.isoformat(),
            }
            for msg in messages
        ]

        return Response(serialized_messages)