package main

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"text/tabwriter"

	"biotak-go-backend/internal/config"
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/services"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize Redis client
	redisConfig := database.DefaultRedisConfig(cfg.RedisURL)
	redisClient, err := database.NewRedisClient(redisConfig)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to connect to Redis: %v\n", err)
		os.Exit(1)
	}
	defer redisClient.Close()

	// Initialize feature flag service
	service := services.NewFeatureFlagService(redisClient.Client)
	ctx := context.Background()

	command := os.Args[1]

	switch command {
	case "list":
		listFlags(ctx, service)
	case "get":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: feature-flags get <flag-name>\n")
			os.Exit(1)
		}
		getFlag(ctx, service, os.Args[2])
	case "set":
		if len(os.Args) < 4 {
			fmt.Fprintf(os.Stderr, "Usage: feature-flags set <flag-name> <rollout-percentage>\n")
			os.Exit(1)
		}
		rollout, err := strconv.Atoi(os.Args[3])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Invalid rollout percentage: %v\n", err)
			os.Exit(1)
		}
		setRollout(ctx, service, os.Args[2], rollout)
	case "enable":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: feature-flags enable <flag-name>\n")
			os.Exit(1)
		}
		setRollout(ctx, service, os.Args[2], 100)
	case "disable":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: feature-flags disable <flag-name>\n")
			os.Exit(1)
		}
		setRollout(ctx, service, os.Args[2], 0)
	case "init":
		initFlags(ctx, service)
	case "check":
		if len(os.Args) < 4 {
			fmt.Fprintf(os.Stderr, "Usage: feature-flags check <flag-name> <user-id>\n")
			os.Exit(1)
		}
		checkFlag(ctx, service, os.Args[2], os.Args[3])
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Feature Flag Management CLI")
	fmt.Println()
	fmt.Println("Usage:")
	fmt.Println("  feature-flags list                           - List all feature flags")
	fmt.Println("  feature-flags get <flag-name>                - Get a specific flag")
	fmt.Println("  feature-flags set <flag-name> <percentage>   - Set rollout percentage (0-100)")
	fmt.Println("  feature-flags enable <flag-name>             - Enable flag (100% rollout)")
	fmt.Println("  feature-flags disable <flag-name>            - Disable flag (0% rollout)")
	fmt.Println("  feature-flags init                           - Initialize default flags")
	fmt.Println("  feature-flags check <flag-name> <user-id>    - Check if flag is enabled for user")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  feature-flags list")
	fmt.Println("  feature-flags set auth.login 25")
	fmt.Println("  feature-flags enable post.create")
	fmt.Println("  feature-flags check auth.login user123")
}

func listFlags(ctx context.Context, service *services.FeatureFlagService) {
	flags, err := service.ListFlags(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to list flags: %v\n", err)
		os.Exit(1)
	}

	if len(flags) == 0 {
		fmt.Println("No feature flags found. Run 'feature-flags init' to initialize default flags.")
		return
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "NAME\tENABLED\tROLLOUT\tDESCRIPTION\tUPDATED")
	fmt.Fprintln(w, "----\t-------\t-------\t-----------\t-------")

	for _, flag := range flags {
		enabled := "No"
		if flag.Enabled {
			enabled = "Yes"
		}
		fmt.Fprintf(w, "%s\t%s\t%d%%\t%s\t%s\n",
			flag.Name,
			enabled,
			flag.Rollout,
			flag.Description,
			flag.UpdatedAt.Format("2006-01-02 15:04"),
		)
	}

	w.Flush()
}

func getFlag(ctx context.Context, service *services.FeatureFlagService, name string) {
	flag, err := service.GetFlag(ctx, name)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get flag: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Name:        %s\n", flag.Name)
	fmt.Printf("Enabled:     %v\n", flag.Enabled)
	fmt.Printf("Rollout:     %d%%\n", flag.Rollout)
	fmt.Printf("Description: %s\n", flag.Description)
	fmt.Printf("Updated:     %s\n", flag.UpdatedAt.Format("2006-01-02 15:04:05"))
}

func setRollout(ctx context.Context, service *services.FeatureFlagService, name string, rollout int) {
	if err := service.UpdateRollout(ctx, name, rollout); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to update rollout: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Updated %s to %d%% rollout\n", name, rollout)
}

func initFlags(ctx context.Context, service *services.FeatureFlagService) {
	if err := service.InitializeDefaultFlags(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize flags: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("✓ Feature flags initialized successfully")
	fmt.Println()
	listFlags(ctx, service)
}

func checkFlag(ctx context.Context, service *services.FeatureFlagService, name string, userID string) {
	enabled, err := service.IsEnabled(ctx, name, userID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to check flag: %v\n", err)
		os.Exit(1)
	}

	status := "disabled"
	if enabled {
		status = "enabled"
	}

	fmt.Printf("Flag '%s' is %s for user '%s'\n", name, status, userID)
}
