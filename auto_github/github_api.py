import os
import requests
from dotenv import load_dotenv

# Cargamos nuestro archivo .env
load_dotenv(dotenv_path="../.env")
# Leemos el token
TOKEN = os.getenv("LLAVEGIT")
USERNAME = "JuanOsorner"
url = f"https://api.github.com/users/{USERNAME}/repos"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}"
    }

def get_repos():
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        return response.json()
    else:
        return f"Error: {response.status_code}"

if __name__ == "__main__":
    repos = get_repos()
    if isinstance(repos, list):
        print("Repositorios encontrados:")
        for repo in repos:
            print(f"- {repo['name']}")
    else:
        print(repos)