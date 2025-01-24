from django.urls import path
from .views import SignupView, LoginView, UserListView, MessageListView, CurrentUserView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('messages/<int:user_id>/', MessageListView.as_view(), name='message-list'),
    path('current-user/', CurrentUserView.as_view(), name='current-user'),
]