import time


class CircuitOpen(RuntimeError):
    pass


class CircuitBreaker:
    def __init__(self, threshold=3, cooldown=30):
        self.threshold = threshold
        self.cooldown = cooldown
        self.failures = 0
        self.opened_at = None
        self.probing = False

    def acquire(self):
        if self.opened_at is None:
            return
        if time.monotonic() - self.opened_at < self.cooldown or self.probing:
            raise CircuitOpen("Provider temporarily unavailable")
        self.probing = True

    def success(self):
        self.failures = 0
        self.opened_at = None
        self.probing = False

    def failure(self):
        self.failures += 1
        if self.probing or self.failures >= self.threshold:
            self.opened_at = time.monotonic()
        self.probing = False

    def cancel(self):
        self.probing = False
