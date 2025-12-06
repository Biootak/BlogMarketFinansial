package utils

import (
	"regexp"
	"strings"
	"unicode"
)

// Persian to English transliteration map
// Matches the persianToEnglishMap from Next.js utils
var persianToEnglishMap = map[rune]string{
	'ا': "a", 'آ': "a", 'ب': "b", 'پ': "p", 'ت': "t", 'ث': "s",
	'ج': "j", 'چ': "ch", 'ح': "h", 'خ': "kh", 'د': "d", 'ذ': "z",
	'ر': "r", 'ز': "z", 'ژ': "zh", 'س': "s", 'ش': "sh", 'ص': "s",
	'ض': "z", 'ط': "t", 'ظ': "z", 'ع': "a", 'غ': "gh", 'ف': "f",
	'ق': "gh", 'ک': "k", 'گ': "g", 'ل': "l", 'م': "m", 'ن': "n",
	'و': "o", 'ه': "h", 'ی': "i", 'ي': "i", 'ئ': "i", 'ء': "",
	'ة': "h", 'ؤ': "o", 'إ': "e", 'أ': "a", 'ـ': "",
	// Persian digits
	'۰': "0", '۱': "1", '۲': "2", '۳': "3", '۴': "4",
	'۵': "5", '۶': "6", '۷': "7", '۸': "8", '۹': "9",
	// Arabic digits
	'٠': "0", '١': "1", '٢': "2", '٣': "3", '٤': "4",
	'٥': "5", '٦': "6", '٧': "7", '٨': "8", '٩': "9",
}

// Common Persian to English dictionary for frequently used words
// This is a subset - in production, you'd load this from a file or database
var persianToEnglishDictionary = map[string]string{
	"بیتکوین":  "bitcoin",
	"اتریوم":   "ethereum",
	"ارز":      "currency",
	"دیجیتال":  "digital",
	"بازار":    "market",
	"قیمت":     "price",
	"تحلیل":    "analysis",
	"خبر":      "news",
	"اخبار":    "news",
	"مقاله":    "article",
	"پست":      "post",
	"کاربر":    "user",
	"نویسنده":  "author",
	"دسته":     "category",
	"برچسب":    "tag",
	"نظر":      "comment",
	"کامنت":    "comment",
	"جدید":     "new",
	"قدیمی":    "old",
	"محبوب":    "popular",
	"ویژه":     "featured",
	"مهم":      "important",
	"سریع":     "fast",
	"آهسته":    "slow",
	"بالا":     "high",
	"پایین":    "low",
	"افزایش":   "increase",
	"کاهش":     "decrease",
	"تغییر":    "change",
	"رشد":      "growth",
	"سقوط":     "fall",
	"صعود":     "rise",
	"معامله":   "trade",
	"خرید":     "buy",
	"فروش":     "sell",
	"سرمایه":   "capital",
	"سود":      "profit",
	"زیان":     "loss",
	"ریسک":     "risk",
	"امن":      "safe",
	"خطرناک":   "dangerous",
	"استراتژی": "strategy",
	"روش":      "method",
	"راهنما":   "guide",
	"آموزش":    "tutorial",
	"درس":      "lesson",
	"دوره":     "course",
	"ویدیو":    "video",
	"صوتی":     "audio",
	"تصویری":   "image",
	"گالری":    "gallery",
	"عکس":      "photo",
	"فیلم":     "video",
	"پادکست":   "podcast",
}

// translateWord translates a single Persian word to English
// First checks the dictionary, then falls back to transliteration
func translateWord(word string) string {
	normalized := strings.TrimSpace(word)
	
	// Check dictionary first
	if translation, exists := persianToEnglishDictionary[normalized]; exists {
		return translation
	}
	
	// Fallback to character-by-character transliteration
	var result strings.Builder
	for _, char := range normalized {
		if transliteration, exists := persianToEnglishMap[char]; exists {
			result.WriteString(transliteration)
		} else if unicode.IsLetter(char) || unicode.IsDigit(char) {
			// Keep English letters and digits, convert to lowercase
			result.WriteRune(unicode.ToLower(char))
		}
	}
	
	return result.String()
}

// GenerateSlug creates a URL-safe slug from a title
// Compatible with the Next.js generateSlug function
// Handles Persian/Arabic characters through transliteration
func GenerateSlug(title string) string {
	if title == "" {
		return "untitled"
	}
	
	// Split by spaces and zero-width non-joiner (U+200C)
	// This regex matches the Next.js implementation: /[\s\u200C]+/
	// In Go, we need to use the actual Unicode character or \x{200C}
	words := regexp.MustCompile(`[\s\x{200C}]+`).Split(title, -1)
	
	// Filter empty words and translate each word
	var translatedWords []string
	for _, word := range words {
		if len(word) > 0 {
			translated := translateWord(word)
			if len(translated) > 0 {
				translatedWords = append(translatedWords, translated)
			}
		}
	}
	
	// Join words with hyphens
	slug := strings.Join(translatedWords, "-")
	
	// Remove non-allowed characters (keep only a-z, 0-9, and -)
	slug = regexp.MustCompile(`[^a-z0-9-]`).ReplaceAllString(slug, "")
	
	// Replace multiple consecutive hyphens with single hyphen
	slug = regexp.MustCompile(`-+`).ReplaceAllString(slug, "-")
	
	// Remove leading and trailing hyphens
	slug = strings.Trim(slug, "-")
	
	// Ensure slug doesn't start with a number
	if len(slug) > 0 && unicode.IsDigit(rune(slug[0])) {
		slug = "post-" + slug
	}
	
	// Limit slug length to 100 characters
	if len(slug) > 100 {
		slug = slug[:100]
		// Remove partial word at the end (everything after last hyphen)
		if lastHyphen := strings.LastIndex(slug, "-"); lastHyphen > 0 {
			slug = slug[:lastHyphen]
		}
	}
	
	// Return "untitled" if slug is empty after all processing
	if slug == "" {
		return "untitled"
	}
	
	return slug
}

// ValidateSlug checks if a slug is valid
// Compatible with the Next.js validateSlug function
func ValidateSlug(slug string) bool {
	if slug == "" {
		return false
	}
	
	// Slug should only contain lowercase letters, numbers, and hyphens
	// Should not start or end with a hyphen
	// Should not contain consecutive hyphens
	pattern := regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	return pattern.MatchString(slug)
}
