from ejercicios_pq.ejercicio1 import ejercicio1


def main():
    ejercicio = ejercicio1(
        [0, 0, 5, 0, 9, 0]
    )
    try:
        diccionario = ejercicio.convertir_a_disperso()
        print(diccionario)
    except ValueError as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    main()