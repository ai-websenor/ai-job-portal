"""Application exception hierarchy.

Layers raise these; endpoint handlers catch and map to HTTP codes.
"""


class AppError(Exception):
    """Base for all application errors."""

    def __init__(self, message: str, detail: str = ""):
        self.message = message
        self.detail = detail
        super().__init__(message)


class ExternalServiceError(AppError):
    """SageMaker / S3 / any AWS service down or erroring."""
    pass


class DatabaseError(AppError):
    """DB connection, query, or constraint errors."""
    pass


class ExtractionError(AppError):
    """PDF/DOCX text extraction failures."""
    pass
