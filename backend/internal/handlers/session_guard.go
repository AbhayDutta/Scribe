package handlers

import (
	"fmt"
	"sync"
	"time"
)

type SessionGuard struct {
	mu           sync.Mutex
	videoCounts  map[string]int
	lastActivity map[string]time.Time
	maxFrames    int
}

func NewSessionGuard(maxFramesPerVideo int) *SessionGuard {
	if maxFramesPerVideo <= 0 {
		maxFramesPerVideo = 50
	}
	sg := &SessionGuard{
		videoCounts:  make(map[string]int),
		lastActivity: make(map[string]time.Time),
		maxFrames:    maxFramesPerVideo,
	}

	go sg.cleanupRoutine()
	return sg
}

func (sg *SessionGuard) RecordAndCheck(videoID string) (int, error) {
	if videoID == "" {
		return 0, nil
	}

	sg.mu.Lock()
	defer sg.mu.Unlock()

	sg.lastActivity[videoID] = time.Now()
	current := sg.videoCounts[videoID]

	if current >= sg.maxFrames {
		return current, fmt.Errorf("session frame limit reached (%d/%d frames analyzed for video %s)", current, sg.maxFrames, videoID)
	}

	sg.videoCounts[videoID] = current + 1
	return current + 1, nil
}

func (sg *SessionGuard) cleanupRoutine() {
	ticker := time.NewTicker(15 * time.Minute)
	for range ticker.C {
		sg.mu.Lock()
		cutoff := time.Now().Add(-2 * time.Hour)
		for vid, lastTime := range sg.lastActivity {
			if lastTime.Before(cutoff) {
				delete(sg.videoCounts, vid)
				delete(sg.lastActivity, vid)
			}
		}
		sg.mu.Unlock()
	}
}
