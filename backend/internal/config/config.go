package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                string
	LLMProvider         string // "openai", "claude", "gemini", "mock"
	OpenAIAPIKey        string
	AnthropicAPIKey     string
	GeminiAPIKey        string
	ModelName           string
	AllowedOrigins      string
	RateLimitRPM        int
	MaxFramesPerSession int
}

func LoadConfig() *Config {
	loadDotEnv(".env")

	cfg := &Config{
		Port:                getEnv("PORT", "8080"),
		LLMProvider:         strings.ToLower(getEnv("LLM_PROVIDER", "gemini")),
		OpenAIAPIKey:        getEnv("OPENAI_API_KEY", ""),
		AnthropicAPIKey:     getEnv("ANTHROPIC_API_KEY", ""),
		GeminiAPIKey:        getEnv("GEMINI_API_KEY", ""),
		ModelName:           getEnv("MODEL_NAME", ""),
		AllowedOrigins:      getEnv("ALLOWED_ORIGINS", "*"),
		RateLimitRPM:        getEnvInt("RATE_LIMIT_RPM", 30),
		MaxFramesPerSession: getEnvInt("MAX_FRAMES_PER_SESSION", 50),
	}

	// Auto-detect provider if not explicitly set
	if cfg.GeminiAPIKey != "" && (cfg.LLMProvider == "" || cfg.LLMProvider == "gemini") {
		cfg.LLMProvider = "gemini"
		if cfg.ModelName == "" {
			cfg.ModelName = "gemini-flash-latest"
		}
	} else if cfg.OpenAIAPIKey != "" && cfg.LLMProvider == "openai" {
		if cfg.ModelName == "" {
			cfg.ModelName = "gpt-4o-mini"
		}
	} else if cfg.AnthropicAPIKey != "" && cfg.LLMProvider == "claude" {
		if cfg.ModelName == "" {
			cfg.ModelName = "claude-3-5-sonnet-20241022"
		}
	}

	return cfg
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && strings.TrimSpace(val) != "" {
		return strings.TrimSpace(val)
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	valStr := getEnv(key, "")
	if valStr == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}

func loadDotEnv(filepath string) {
	file, err := os.Open(filepath)
	if err != nil {
		return // .env is optional
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			v = strings.Trim(v, `"'`)
			if _, exists := os.LookupEnv(k); !exists {
				os.Setenv(k, v)
			}
		}
	}
}
