def generate_attempt_analysis(score: int, topic_results: dict) -> str:
    weak_topics = sorted(
        [
            (name, stats)
            for name, stats in topic_results.items()
            if stats["total_count"] > 0
            and stats["correct_count"] / stats["total_count"] < 0.7
        ],
        key=lambda item: item[1]["correct_count"] / item[1]["total_count"],
    )

    strong_topics = sorted(
        [
            (name, stats)
            for name, stats in topic_results.items()
            if stats["total_count"] > 0
            and stats["correct_count"] / stats["total_count"] >= 0.8
        ],
        key=lambda item: item[1]["correct_count"] / item[1]["total_count"],
        reverse=True,
    )

    weak_topics = [name for name, _ in weak_topics]
    strong_topics = [name for name, _ in strong_topics]

    if score == 100:
        performance = "Outstanding performance! You answered every question correctly."
    elif score >= 90:
        performance = "Excellent performance, with only a few details left to master."
    elif score >= 70:
        performance = "Good performance, but some concepts need more practice."
    elif score >= 50:
        performance = "Fair performance. Reviewing key concepts will help strengthen your understanding."
    else:
        performance = "Your results suggest that you should revisit the main concepts before trying again."

    analysis = [f"{performance} Your overall score was {score}%."]

    if strong_topics:
        analysis.append(
            "Strong topics: " + ", ".join(strong_topics) + "."
        )

    if weak_topics:
        analysis.append(
            "Topics to review: " + ", ".join(weak_topics) + "."
        )

    if score == 100:
        analysis.append(
            "Recommendation: challenge yourself with a harder quiz or explore more advanced concepts."
        )
    elif weak_topics:
        analysis.append(
            f"Recommendation: start with {weak_topics[0]}, "
            "review the related material, and retake the quiz to measure your progress."
        )
    elif score >= 70:
        analysis.append(
            "Recommendation: review the questions you missed and practice similar questions to consolidate your knowledge."
        )
    else:
        analysis.append(
            "Recommendation: revisit the course summary and foundational concepts, "
            "then retake the quiz to check your understanding."
        )

    return " ".join(analysis)
