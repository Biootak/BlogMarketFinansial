package utils

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGenerateSlug(t *testing.T) {
	t.Run("generates slug from English title", func(t *testing.T) {
		title := "Hello World Test"
		expected := "hello-world-test"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})

	t.Run("generates slug from Persian title", func(t *testing.T) {
		title := "بیتکوین و اتریوم"
		// Should use dictionary translations
		expected := "bitcoin-o-ethereum"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})

	t.Run("handles mixed Persian and English", func(t *testing.T) {
		title := "Bitcoin و بازار"
		expected := "bitcoin-o-market"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})

	t.Run("transliterates Persian characters not in dictionary", func(t *testing.T) {
		title := "سلام دنیا"
		// Should transliterate: س=s, ل=l, ا=a, م=m, د=d, ن=n, ی=i, ا=a
		// Note: some vowels may be omitted in transliteration
		slug := GenerateSlug(title)

		assert.NotEmpty(t, slug)
		assert.Regexp(t, `^[a-z0-9-]+$`, slug)
		// Should contain recognizable parts
		assert.Contains(t, slug, "slam") // سلام
	})

	t.Run("handles Persian digits", func(t *testing.T) {
		title := "تست ۱۲۳"
		expected := "tst-123"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})

	t.Run("handles Arabic digits", func(t *testing.T) {
		title := "تست ٠١٢"
		expected := "tst-012"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})

	t.Run("removes special characters", func(t *testing.T) {
		title := "Hello! World? Test 123"
		expected := "hello-world-test-123"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})

	t.Run("handles zero-width non-joiner", func(t *testing.T) {
		// Zero-width non-joiner (U+200C) is common in Persian text
		title := "می\u200Cخواهم"
		// Should split on ZWNJ and transliterate
		slug := GenerateSlug(title)

		assert.NotEmpty(t, slug)
		assert.NotContains(t, slug, "\u200C")
	})

	t.Run("replaces multiple spaces with single hyphen", func(t *testing.T) {
		title := "Hello    World"
		expected := "hello-world"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})

	t.Run("removes leading and trailing hyphens", func(t *testing.T) {
		title := "  Hello World  "
		expected := "hello-world"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})

	t.Run("prefixes with 'post-' if starts with number", func(t *testing.T) {
		title := "123 Test"
		expected := "post-123-test"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})

	t.Run("limits slug length to 100 characters", func(t *testing.T) {
		// Create a very long title
		title := strings.Repeat("word ", 50) // 250 characters
		
		slug := GenerateSlug(title)

		assert.LessOrEqual(t, len(slug), 100)
		// Should not end with a hyphen
		assertNotSuffix(t, slug, "-")
	})

	t.Run("returns 'untitled' for empty string", func(t *testing.T) {
		slug := GenerateSlug("")

		assert.Equal(t, "untitled", slug)
	})

	t.Run("returns 'untitled' for string with only special characters", func(t *testing.T) {
		title := "!@#$%^&*()"
		
		slug := GenerateSlug(title)

		assert.Equal(t, "untitled", slug)
	})

	t.Run("handles common Persian financial terms", func(t *testing.T) {
		testCases := []struct {
			title    string
			expected string
		}{
			{"قیمت بیتکوین", "price-bitcoin"},
			{"تحلیل بازار", "analysis-market"},
			{"خرید و فروش", "buy-o-sell"},
			{"ارز دیجیتال", "currency-digital"},
			{"رشد قیمت", "growth-price"},
		}

		for _, tc := range testCases {
			t.Run(tc.title, func(t *testing.T) {
				slug := GenerateSlug(tc.title)
				assert.Equal(t, tc.expected, slug)
			})
		}
	})

	t.Run("handles uppercase English letters", func(t *testing.T) {
		title := "HELLO WORLD"
		expected := "hello-world"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})

	t.Run("removes consecutive hyphens", func(t *testing.T) {
		title := "Hello - - - World"
		expected := "hello-world"

		slug := GenerateSlug(title)

		assert.Equal(t, expected, slug)
	})
}

func TestValidateSlug(t *testing.T) {
	t.Run("validates correct slug", func(t *testing.T) {
		validSlugs := []string{
			"hello-world",
			"test-123",
			"bitcoin-price",
			"post-456",
			"a",
			"123",
			"hello-world-test-123",
		}

		for _, slug := range validSlugs {
			t.Run(slug, func(t *testing.T) {
				assert.True(t, ValidateSlug(slug), "slug '%s' should be valid", slug)
			})
		}
	})

	t.Run("rejects invalid slugs", func(t *testing.T) {
		invalidSlugs := []string{
			"",                    // empty
			"-hello",              // starts with hyphen
			"hello-",              // ends with hyphen
			"hello--world",        // consecutive hyphens
			"Hello-World",         // uppercase
			"hello_world",         // underscore
			"hello world",         // space
			"hello.world",         // dot
			"hello!world",         // special character
			"سلام",                // Persian characters
			"hello/world",         // slash
			"hello@world",         // at sign
		}

		for _, slug := range invalidSlugs {
			t.Run(slug, func(t *testing.T) {
				assert.False(t, ValidateSlug(slug), "slug '%s' should be invalid", slug)
			})
		}
	})
}

func TestSlugGenerationRoundTrip(t *testing.T) {
	t.Run("generated slugs are always valid", func(t *testing.T) {
		testTitles := []string{
			"Hello World",
			"بیتکوین",
			"Test 123",
			"قیمت ارز دیجیتال",
			"Bitcoin & Ethereum",
			"تحلیل بازار!",
			"سلام دنیا",
			"123 Numbers",
			strings.Repeat("word ", 50), // long title
		}

		for _, title := range testTitles {
			t.Run(title, func(t *testing.T) {
				slug := GenerateSlug(title)
				
				// Generated slug should always be valid
				assert.True(t, ValidateSlug(slug), 
					"generated slug '%s' from title '%s' should be valid", slug, title)
				
				// Should not be empty
				assert.NotEmpty(t, slug)
				
				// Should only contain allowed characters
				assert.Regexp(t, `^[a-z0-9-]+$`, slug)
				
				// Should not start or end with hyphen
				assertNotPrefix(t, slug, "-")
				assertNotSuffix(t, slug, "-")
				
				// Should not exceed 100 characters
				assert.LessOrEqual(t, len(slug), 100)
			})
		}
	})
}

func TestTranslateWord(t *testing.T) {
	t.Run("translates dictionary words", func(t *testing.T) {
		testCases := []struct {
			persian string
			english string
		}{
			{"بیتکوین", "bitcoin"},
			{"اتریوم", "ethereum"},
			{"بازار", "market"},
			{"قیمت", "price"},
		}

		for _, tc := range testCases {
			t.Run(tc.persian, func(t *testing.T) {
				result := translateWord(tc.persian)
				assert.Equal(t, tc.english, result)
			})
		}
	})

	t.Run("transliterates non-dictionary words", func(t *testing.T) {
		// Test character-by-character transliteration
		word := "سلام" // s-l-a-m
		result := translateWord(word)
		
		assert.NotEmpty(t, result)
		assert.Regexp(t, `^[a-z0-9]+$`, result)
	})

	t.Run("handles English words", func(t *testing.T) {
		word := "Hello"
		expected := "hello"
		
		result := translateWord(word)
		
		assert.Equal(t, expected, result)
	})

	t.Run("handles mixed content", func(t *testing.T) {
		word := "Test123"
		expected := "test123"
		
		result := translateWord(word)
		
		assert.Equal(t, expected, result)
	})
}

// Helper assertion functions
func assertNotPrefix(t *testing.T, s, prefix string) {
	t.Helper()
	if strings.HasPrefix(s, prefix) {
		t.Errorf("string '%s' should not have prefix '%s'", s, prefix)
	}
}

func assertNotSuffix(t *testing.T, s, suffix string) {
	t.Helper()
	if strings.HasSuffix(s, suffix) {
		t.Errorf("string '%s' should not have suffix '%s'", s, suffix)
	}
}
