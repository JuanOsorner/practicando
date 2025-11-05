from django.shortcuts import render

# Create your views here.
def mostrar_login(request):
    return render(request, 'login.html')