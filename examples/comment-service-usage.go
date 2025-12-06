package main

import (
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/repositories"
	"biotak-go-backend/internal/services"
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	ctx := context.Background()

	// Initialize database client
	dbConfig := database.DefaultConfig(os.Getenv("DATABASE_URL"))
	entClient, err := database.NewEntClient(dbConfig)
	if err != nil {
		log.Fatalf("Failed to create database client: %v", err)
	}
	defer entClient.Close()

	dbClient := entClient.GetClient()

	// Initialize Redis client
	redisConfig := database.DefaultRedisConfig(os.Getenv("REDIS_URL"))
	redisClient, err := database.NewRedisClient(redisConfig)
	if err != nil {
		log.Printf("Warning: Failed to create Redis client: %v", err)
		redisClient = nil
	}

	// Initialize repositories
	commentRepo := repositories.NewCommentRepository(dbClient)

	// Initialize services
	commentService := services.NewCommentService(commentRepo, dbClient, redisClient)

	// Example 1: Create a comment
	fmt.Println("=== Example 1: Create a Comment ===")
	createReq := services.CreateCommentRequest{
		Content: "This is a great article! Very informative.",
		PostID:  "example-post-id",
	}

	comment, err := commentService.CreateComment(ctx, createReq, "example-user-id")
	if err != nil {
		log.Printf("Failed to create comment: %v", err)
	} else {
		fmt.Printf("Created comment: %s\n", comment.ID)
		fmt.Printf("Content: %s\n", comment.Content)
		fmt.Printf("Approved: %v\n", comment.Approved)
	}

	// Example 2: Create a spam comment (should be flagged)
	fmt.Println("\n=== Example 2: Create a Spam Comment ===")
	spamReq := services.CreateCommentRequest{
		Content: "BUY NOW! Click here for free money! http://spam1.com http://spam2.com http://spam3.com http://spam4.com",
		PostID:  "example-post-id",
	}

	spamComment, err := commentService.CreateComment(ctx, spamReq, "example-user-id")
	if err != nil {
		log.Printf("Failed to create spam comment: %v", err)
	} else {
		fmt.Printf("Created comment: %s\n", spamComment.ID)
		fmt.Printf("Content: %s\n", spamComment.Content)
		fmt.Printf("Approved (should be false): %v\n", spamComment.Approved)
	}

	// Example 3: Get comments for a post (regular user)
	fmt.Println("\n=== Example 3: Get Comments (Regular User) ===")
	comments, err := commentService.GetComments(ctx, "example-post-id", "USER")
	if err != nil {
		log.Printf("Failed to get comments: %v", err)
	} else {
		fmt.Printf("Found %d approved comments\n", len(comments))
		for _, c := range comments {
			fmt.Printf("- %s: %s (Approved: %v)\n", c.ID, c.Content[:min(50, len(c.Content))], c.Approved)
		}
	}

	// Example 4: Get comments for a post (admin user - includes pending)
	fmt.Println("\n=== Example 4: Get Comments (Admin User) ===")
	allComments, err := commentService.GetComments(ctx, "example-post-id", "ADMIN")
	if err != nil {
		log.Printf("Failed to get comments: %v", err)
	} else {
		fmt.Printf("Found %d total comments (including pending)\n", len(allComments))
		for _, c := range allComments {
			fmt.Printf("- %s: %s (Approved: %v)\n", c.ID, c.Content[:min(50, len(c.Content))], c.Approved)
		}
	}

	// Example 5: Moderate a comment (approve)
	fmt.Println("\n=== Example 5: Moderate Comment (Approve) ===")
	if spamComment != nil {
		moderatedComment, err := commentService.ModerateComment(
			ctx,
			spamComment.ID,
			services.ModerationActionApprove,
			"admin-user-id",
			"ADMIN",
		)
		if err != nil {
			log.Printf("Failed to moderate comment: %v", err)
		} else {
			fmt.Printf("Moderated comment: %s\n", moderatedComment.ID)
			fmt.Printf("New approval status: %v\n", moderatedComment.Approved)
		}
	}

	// Example 6: Check spam detection
	fmt.Println("\n=== Example 6: Spam Detection Examples ===")
	testCases := []string{
		"This is a normal comment",
		"BUY NOW! LIMITED OFFER!",
		"Check out http://link1.com http://link2.com http://link3.com http://link4.com",
		"HELLO THIS IS ALL CAPS SPAM MESSAGE",
		"This has repeateddddddd characters",
	}

	for _, content := range testCases {
		isSpam := commentService.CheckSpam(content)
		fmt.Printf("Content: %s\n", content[:min(50, len(content))])
		fmt.Printf("Is Spam: %v\n\n", isSpam)
	}

	// Example 7: Get pending comments for moderation
	fmt.Println("\n=== Example 7: Get Pending Comments ===")
	pendingComments, total, err := commentService.GetPendingComments(ctx, 10, 0)
	if err != nil {
		log.Printf("Failed to get pending comments: %v", err)
	} else {
		fmt.Printf("Found %d pending comments (total: %d)\n", len(pendingComments), total)
		for _, c := range pendingComments {
			fmt.Printf("- %s: %s\n", c.ID, c.Content[:min(50, len(c.Content))])
		}
	}

	fmt.Println("\n=== Comment Service Examples Complete ===")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
