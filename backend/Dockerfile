# ==========================================
# Scribe Backend — Multi-stage Production Dockerfile
# ==========================================

# Stage 1: Build
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git and SSL certificates
RUN apk add --no-cache git ca-certificates tzdata

# Cache Go modules
COPY go.mod ./
RUN go mod download || true

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.version=1.0.0" \
    -o /app/scribe-server .

# Stage 2: Minimal Runtime
FROM alpine:3.20

WORKDIR /app

# Install ca-certificates for secure outbound HTTPS calls to LLM APIs
RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S scribe && adduser -S scribe -G scribe

# Copy compiled binary and SSL certs from builder
COPY --from=builder /app/scribe-server /app/scribe-server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Use non-root user for security
USER scribe

# Expose default HTTP port
EXPOSE 8080

# Environment defaults
ENV PORT=8080 \
    LLM_PROVIDER=gemini \
    RATE_LIMIT_RPM=30 \
    MAX_FRAMES_PER_SESSION=50

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

ENTRYPOINT ["/app/scribe-server"]
