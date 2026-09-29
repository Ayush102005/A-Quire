def generate_test_case() -> list:
    import random
    if random.random() < 0.3:
        n = random.choice([0, 1, 5000, 4999])
    else:
        n = random.randint(0, 200)
    head = [random.randint(-5000, 5000) for _ in range(n)]
    expected_output = head[::-1]
    return [head, expected_output]