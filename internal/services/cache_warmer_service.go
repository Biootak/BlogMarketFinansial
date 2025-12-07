package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/ent/post"

	"github.com/redis/go-redis/v9"
)

// CacheWarmerService handles cache warming operations
type CacheWarmerService struct {
	client      *ent.Client
	redisClient *redis.Client
}

// NewCacheWarmerService creates a new cache warmer service
func NewCacheWarmerService(client *ent.Client, redisClient *redis.Client) *CacheWarmerService {
	return &CacheWarmerService{
		client:      client,
		redisClient: redisClient,
	}
}

// WarmPopularPosts pre-populates cache with popular posts
func (s *CacheWarmerService) WarmPopularPosts(ctx context.Context, limit int) error {
	log.Printf("[CacheWarmerService] Warming cache for top %d popular posts", limit)
	
	// Fetch popular posts
	posts, err := s.client.Post.
		Query().
		Where(
			post.StatusEQ(post.StatusPUBLISHED),
			post.DeletedAtIsNil(),
		).
		Order(ent.Desc(post.FieldViewCount)).
		Limit(limit).
		WithAuthor().
		WithCategories().
		WithTags().
		All(ctx)
	
	if err != nil {
		return fmt.Errorf("failed to fetch popular posts: %w", err)
	}
	
	// Cache each post
	cachedCount := 0
	for _, p := range posts {
		// Cache by ID
		cacheKey := fmt.Sprintf("post:id:%s", p.ID)
		data, err := json.Marshal(p)
		if err != nil {
			log.Printf("[CacheWarmerService] Failed to marshal post %s: %v", p.ID, err)
			continue
		}
		
		err = s.redisClient.Set(ctx, cacheKey, data, 1*time.Hour).Err()
		if err != nil {
			log.Printf("[CacheWarmerService] Failed to cache post %s: %v", p.ID, err)
			continue
		}
		
		// Cache by slug
		cacheKeySlug := fmt.Sprintf("post:slug:%s", p.Slug)
		err = s.redisClient.Set(ctx, cacheKeySlug, data, 1*time.Hour).Err()
		if err != nil {
			log.Printf("[CacheWarmerService] Failed to cache post slug %s: %v", p.Slug, err)
			continue
		}
		
		cachedCount++
	}
	
	log.Printf("[CacheWarmerService] Successfully cached %d popular posts", cachedCount)
	return nil
}

// WarmCategories pre-populates cache with all categories
func (s *CacheWarmerService) WarmCategories(ctx context.Context) error {
	log.Println("[CacheWarmerService] Warming cache for categories")
	
	// Fetch all categories
	categories, err := s.client.Category.
		Query().
		All(ctx)
	
	if err != nil {
		return fmt.Errorf("failed to fetch categories: %w", err)
	}
	
	// Cache categories list
	cacheKey := "categories:all"
	data, err := json.Marshal(categories)
	if err != nil {
		return fmt.Errorf("failed to marshal categories: %w", err)
	}
	
	err = s.redisClient.Set(ctx, cacheKey, data, 2*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to cache categories: %w", err)
	}
	
	// Cache individual categories
	cachedCount := 0
	for _, cat := range categories {
		cacheKey := fmt.Sprintf("category:slug:%s", cat.Slug)
		data, err := json.Marshal(cat)
		if err != nil {
			log.Printf("[CacheWarmerService] Failed to marshal category %s: %v", cat.Slug, err)
			continue
		}
		
		err = s.redisClient.Set(ctx, cacheKey, data, 2*time.Hour).Err()
		if err != nil {
			log.Printf("[CacheWarmerService] Failed to cache category %s: %v", cat.Slug, err)
			continue
		}
		
		cachedCount++
	}
	
	log.Printf("[CacheWarmerService] Successfully cached %d categories", cachedCount)
	return nil
}

// WarmTags pre-populates cache with all tags
func (s *CacheWarmerService) WarmTags(ctx context.Context) error {
	log.Println("[CacheWarmerService] Warming cache for tags")
	
	// Fetch all tags
	tags, err := s.client.Tag.
		Query().
		All(ctx)
	
	if err != nil {
		return fmt.Errorf("failed to fetch tags: %w", err)
	}
	
	// Cache tags list
	cacheKey := "tags:all"
	data, err := json.Marshal(tags)
	if err != nil {
		return fmt.Errorf("failed to marshal tags: %w", err)
	}
	
	err = s.redisClient.Set(ctx, cacheKey, data, 2*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to cache tags: %w", err)
	}
	
	log.Printf("[CacheWarmerService] Successfully cached %d tags", len(tags))
	return nil
}

// WarmExchangeRates pre-populates cache with exchange rates
func (s *CacheWarmerService) WarmExchangeRates(ctx context.Context, exchangeService *ExchangeRateService) error {
	log.Println("[CacheWarmerService] Warming cache for exchange rates")
	
	// Fetch fresh exchange rates
	err := exchangeService.FetchRates(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch exchange rates: %w", err)
	}
	
	log.Println("[CacheWarmerService] Successfully warmed exchange rates cache")
	return nil
}

// VerifyCacheData verifies that data is present in cache
func (s *CacheWarmerService) VerifyCacheData(ctx context.Context) (map[string]bool, error) {
	log.Println("[CacheWarmerService] Verifying cache data")
	
	results := make(map[string]bool)
	
	// Check popular posts
	exists, err := s.redisClient.Exists(ctx, "post:id:*").Result()
	if err != nil {
		log.Printf("[CacheWarmerService] Failed to check posts cache: %v", err)
	}
	results["popular_posts"] = exists > 0
	
	// Check categories
	exists, err = s.redisClient.Exists(ctx, "categories:all").Result()
	if err != nil {
		log.Printf("[CacheWarmerService] Failed to check categories cache: %v", err)
	}
	results["categories"] = exists > 0
	
	// Check tags
	exists, err = s.redisClient.Exists(ctx, "tags:all").Result()
	if err != nil {
		log.Printf("[CacheWarmerService] Failed to check tags cache: %v", err)
	}
	results["tags"] = exists > 0
	
	// Check exchange rates
	exists, err = s.redisClient.Exists(ctx, "exchange_rates:*").Result()
	if err != nil {
		log.Printf("[CacheWarmerService] Failed to check exchange rates cache: %v", err)
	}
	results["exchange_rates"] = exists > 0
	
	log.Printf("[CacheWarmerService] Cache verification results: %+v", results)
	return results, nil
}
