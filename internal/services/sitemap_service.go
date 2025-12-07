package services

import (
	"bytes"
	"context"
	"encoding/xml"
	"fmt"
	"log"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/ent/post"
)

// SitemapService handles sitemap generation
type SitemapService struct {
	client *ent.Client
}

// NewSitemapService creates a new sitemap service
func NewSitemapService(client *ent.Client) *SitemapService {
	return &SitemapService{
		client: client,
	}
}

// URLSet represents the root element of a sitemap
type URLSet struct {
	XMLName xml.Name `xml:"urlset"`
	Xmlns   string   `xml:"xmlns,attr"`
	URLs    []URL    `xml:"url"`
}

// URL represents a single URL entry in the sitemap
type URL struct {
	Loc        string  `xml:"loc"`
	LastMod    string  `xml:"lastmod,omitempty"`
	ChangeFreq string  `xml:"changefreq,omitempty"`
	Priority   float64 `xml:"priority,omitempty"`
}

// GenerateSitemap generates an XML sitemap for all published posts
func (s *SitemapService) GenerateSitemap(ctx context.Context) ([]byte, error) {
	// Fetch all published posts
	posts, err := s.client.Post.
		Query().
		Where(
			post.StatusEQ(post.StatusPUBLISHED),
			post.DeletedAtIsNil(),
		).
		Order(ent.Desc(post.FieldCreatedAt)).
		All(ctx)
	
	if err != nil {
		return nil, fmt.Errorf("failed to fetch published posts: %w", err)
	}
	
	log.Printf("[SitemapService] Generating sitemap for %d published posts", len(posts))
	
	// Create URLSet
	urlSet := URLSet{
		Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  make([]URL, 0, len(posts)+10), // +10 for static pages
	}
	
	// Add static pages
	baseURL := "https://biotak.ir"
	staticPages := []struct {
		path       string
		changeFreq string
		priority   float64
	}{
		{"/", "daily", 1.0},
		{"/about", "monthly", 0.8},
		{"/contact", "monthly", 0.7},
		{"/archive", "daily", 0.9},
		{"/categories", "weekly", 0.8},
		{"/tags", "weekly", 0.8},
		{"/authors", "weekly", 0.7},
	}
	
	for _, page := range staticPages {
		urlSet.URLs = append(urlSet.URLs, URL{
			Loc:        baseURL + page.path,
			LastMod:    time.Now().Format("2006-01-02"),
			ChangeFreq: page.changeFreq,
			Priority:   page.priority,
		})
	}
	
	// Add post URLs
	for _, p := range posts {
		// Determine change frequency based on post age
		changeFreq := "monthly"
		daysSinceUpdate := time.Since(p.UpdatedAt).Hours() / 24
		if daysSinceUpdate < 7 {
			changeFreq = "daily"
		} else if daysSinceUpdate < 30 {
			changeFreq = "weekly"
		}
		
		// Determine priority based on view count and featured status
		priority := 0.6
		if p.IsFeatured {
			priority = 0.9
		} else if p.ViewCount > 1000 {
			priority = 0.8
		} else if p.ViewCount > 500 {
			priority = 0.7
		}
		
		urlSet.URLs = append(urlSet.URLs, URL{
			Loc:        fmt.Sprintf("%s/posts/%s", baseURL, p.Slug),
			LastMod:    p.UpdatedAt.Format("2006-01-02"),
			ChangeFreq: changeFreq,
			Priority:   priority,
		})
	}
	
	// Marshal to XML
	var buf bytes.Buffer
	buf.WriteString(xml.Header)
	
	encoder := xml.NewEncoder(&buf)
	encoder.Indent("", "  ")
	
	if err := encoder.Encode(urlSet); err != nil {
		return nil, fmt.Errorf("failed to encode sitemap XML: %w", err)
	}
	
	log.Printf("[SitemapService] Generated sitemap with %d URLs", len(urlSet.URLs))
	return buf.Bytes(), nil
}

// SaveSitemapToFile saves the sitemap to a file (for local storage)
// In production, this would upload to S3
func (s *SitemapService) SaveSitemapToFile(ctx context.Context, sitemapData []byte, filename string) error {
	// TODO: Implement S3 upload
	// For now, we'll just log that we would save it
	log.Printf("[SitemapService] Would save sitemap to S3: %s (%d bytes)", filename, len(sitemapData))
	
	// In a real implementation:
	// 1. Initialize S3 client
	// 2. Upload sitemapData to S3 bucket
	// 3. Set appropriate content-type (application/xml)
	// 4. Set public-read ACL
	// 5. Return any errors
	
	return nil
}
