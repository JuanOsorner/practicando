from django.shortcuts import render
from django.contrib.auth.decorators import login_required

# Aqui hay que proteger las vistas
def home_view(request):
    return render(request, 'home.html')