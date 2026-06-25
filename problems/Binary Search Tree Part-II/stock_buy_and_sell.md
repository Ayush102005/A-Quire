# Stock Buy and Sell

- **Topic:** Binary Search Tree Part-II
- **Difficulty:** Medium
- **LeetCode Link:** [Solve on LeetCode](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/)
- **TUF+ Link:** [Solve on TUF+](https://takeuforward.org/plus/dsa/problems/best-time-to-buy-and-sell-stock?source=strivers-sde-sheet)
- **YouTube Video:** [Watch Video Explanation](https://youtu.be/excAOvwF_Wk)
- **Article Link:** [Full Editorial](https://takeuforward.org/data-structure/stock-buy-and-sell/)

## Problem Statement

You are given an array of prices where prices[i] is the price of a given stock on an ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.

---

## Approaches

### Brute Force Approach

#### Complexity Analysis

- **Time Complexity:** O(n²) Because for each element, we are checking every future element  nested loops. Space Complexity: O(1) No extra space used, only variables for storing max profit.
- **Space Complexity:** O(1) No extra space used, only variables for storing max profit.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to calculate max profit using brute force
    int stockbuySell(vector<int>& prices) {
        // Initialize max profit to 0
        int maxProfit = 0;

        // Loop through each day as a potential buy day
        for(int i = 0; i < prices.size(); i++) {
            // Loop through each future day as a potential sell day
            for(int j = i + 1; j < prices.size(); j++) {
                // Calculate the profit
                int profit = prices[j] - prices[i];

                // Update max profit if this is higher
                maxProfit = max(maxProfit, profit);
            }
        }

        // Return the maximum profit
        return maxProfit;
    }
};

// Driver code
int main() {
    Solution sol;
    vector<int> prices = {7, 1, 5, 3, 6, 4};
    cout << "Max Profit: " << sol.stockbuySell(prices) << endl;
    return 0;
}
```

##### JAVA

```java
class Solution {
    // Function to calculate max profit using brute force
    public int stockbuySell(int[] prices) {
        // Initialize max profit to 0
        int maxProfit = 0;

        // Loop through each day as a potential buy day
        for (int i = 0; i < prices.length; i++) {
            // Loop through each future day as a potential sell day
            for (int j = i + 1; j < prices.length; j++) {
                // Calculate profit
                int profit = prices[j] - prices[i];

                // Update max profit if higher
                maxProfit = Math.max(maxProfit, profit);
            }
        }

        // Return the maximum profit
        return maxProfit;
    }
}

// Driver class
class Main {
    public static void main(String[] args) {
        Solution sol = new Solution();
        int[] prices = {7, 1, 5, 3, 6, 4};
        System.out.println("Max Profit: " + sol.stockbuySell(prices));
    }
}
```

##### PYTHON

```python
class Solution:
    # Function to calculate max profit using brute force
    def stockbuySell(self, prices):
        # Initialize max profit to 0
        maxProfit = 0

        # Loop through each day as potential buy day
        for i in range(len(prices)):
            # Loop through future days as potential sell day
            for j in range(i + 1, len(prices)):
                # Calculate profit
                profit = prices[j] - prices[i]

                # Update max profit if higher
                maxProfit = max(maxProfit, profit)

        # Return the maximum profit
        return maxProfit

# Driver code
sol = Solution()
prices = [7, 1, 5, 3, 6, 4]
print("Max Profit:", sol.stockbuySell(prices))
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to calculate max profit using brute force
    stockbuySell(prices) {
        // Initialize max profit to 0
        let maxProfit = 0;

        // Loop through each day as potential buy day
        for (let i = 0; i < prices.length; i++) {
            // Loop through each future day as sell day
            for (let j = i + 1; j < prices.length; j++) {
                // Calculate profit
                let profit = prices[j] - prices[i];

                // Update max profit if higher
                maxProfit = Math.max(maxProfit, profit);
            }
        }

        // Return the max profit
        return maxProfit;
    }
}

// Driver code
const sol = new Solution();
const prices = [7, 1, 5, 3, 6, 4];
console.log("Max Profit:", sol.stockbuySell(prices));
```

---

### Optimal Approach

#### Complexity Analysis

- **Time Complexity:** O(n),This is because we are iterating through the array of prices exactly once. There are no nested loops or recursive calls. Space Complexity: O(1),Only two variables are used to store the minimum price and maximum profit, regardless of the input size.
- **Space Complexity:** O(1),Only two variables are used to store the minimum price and maximum profit, regardless of the input size.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to calculate maximum profit using single pass
    int stockbuySell(vector<int>& prices) {
        // Initialize the minimum price to a large number
        int minPrice = INT_MAX;

        // Initialize the maximum profit to 0
        int maxProfit = 0;

        // Traverse each price in the array
        for (int price : prices) {
            // If current price is less than minPrice, update minPrice
            if (price < minPrice) {
                minPrice = price;
            }
            // Else calculate profit and update maxProfit if it's greater
            else {
                maxProfit = max(maxProfit, price - minPrice);
            }
        }

        // Return the maximum profit found
        return maxProfit;
    }
};

// Driver code
int main() {
    Solution obj;
    vector<int> prices = {7, 1, 5, 3, 6, 4};

    cout << obj.stockbuySell(prices) << endl;

    return 0;
}
```

##### JAVA

```java
import.java.util.*;
class Solution {
    // Function to calculate maximum profit using single pass
    public int stockbuySell(int[] prices) {
        // Initialize the minimum price to a large number
        int minPrice = Integer.MAX_VALUE;

        // Initialize the maximum profit to 0
        int maxProfit = 0;

        // Traverse each price in the array
        for (int price : prices) {
            // If current price is less than minPrice, update minPrice
            if (price < minPrice) {
                minPrice = price;
            }
            // Else calculate profit and update maxProfit if it's greater
            else {
                maxProfit = Math.max(maxProfit, price - minPrice);
            }
        }

        // Return the maximum profit found
        return maxProfit;
    }
}

// Driver code
class Main {
    public static void main(String[] args) {
        Solution obj = new Solution();
        int[] prices = {7, 1, 5, 3, 6, 4};

        System.out.println(obj.stockbuySell(prices));
    }
}
```

##### PYTHON

```python
class Solution:
    # Function to calculate maximum profit using single pass
    def stockbuySell(self, prices):
        # Initialize the minimum price to a large number
        min_price = float('inf')

        # Initialize the maximum profit to 0
        max_profit = 0

        # Traverse each price in the array
        for price in prices:
            # If current price is less than min_price, update min_price
            if price < min_price:
                min_price = price
            # Else calculate profit and update max_profit if it's greater
            else:
                max_profit = max(max_profit, price - min_price)

        # Return the maximum profit found
        return max_profit

# Driver code
obj = Solution()
prices = [7, 1, 5, 3, 6, 4]
print(obj.stockbuySell(prices))
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to calculate maximum profit using single pass
    stockbuySell(prices) {
        // Initialize the minimum price to a large number
        let minPrice = Infinity;

        // Initialize the maximum profit to 0
        let maxProfit = 0;

        // Traverse each price in the array
        for (let price of prices) {
            // If current price is less than minPrice, update minPrice
            if (price < minPrice) {
                minPrice = price;
            }
            // Else calculate profit and update maxProfit if it's greater
            else {
                maxProfit = Math.max(maxProfit, price - minPrice);
            }
        }

        // Return the maximum profit found
        return maxProfit;
    }
}

// Driver code
const obj = new Solution();
const prices = [7, 1, 5, 3, 6, 4];
console.log(obj.stockbuySell(prices));
```

---

