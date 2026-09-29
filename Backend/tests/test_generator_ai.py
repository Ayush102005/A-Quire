import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.generator_service import generator_service

async def test_generator():
    print("Requesting question from AI Generator...")
    question = await generator_service.generate_question(
        topic_id=1,
        topic_name="Binary Search Trees",
        target_b=0.0
    )
    print("\n--- QUESTION GENERATED ---")
    if question:
        print(f"Content: {question.content}")
        print(f"Options: {question.options}")
        print(f"Correct Option: {question.correct_option}")
    else:
        print("Failed to generate question.")
    print("--------------------------\n")

if __name__ == "__main__":
    asyncio.run(test_generator())
