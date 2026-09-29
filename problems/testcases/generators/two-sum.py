def generate_test_case() -> list:
    import random
    from collections import Counter

    def count_target_pairs(nums, target):
        cnt = Counter(nums)
        total = 0
        for val, c in cnt.items():
            comp = target - val
            if comp not in cnt:
                continue
            if comp == val:
                total += c * (c - 1) // 2
            elif comp > val:
                total += c * cnt[comp]
        return total

    def find_pair(nums, target):
        n = len(nums)
        for i in range(n):
            for j in range(i + 1, n):
                if nums[i] + nums[j] == target:
                    return [i, j]
        return None

    while True:
        if random.random() < 0.3:
            n = random.randint(5000, 10000)
        else:
            n = random.randint(2, 50)

        low, high = -10**9, 10**9
        nums = [random.randint(low, high) for _ in range(n)]

        i, j = random.sample(range(n), 2)
        target = nums[i] + nums[j]

        if count_target_pairs(nums, target) != 1:
            continue

        expected = find_pair(nums, target)
        if expected is None:
            continue

        return [[nums, target], expected]