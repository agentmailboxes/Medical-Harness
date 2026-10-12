import pytest

from app.answer_format import remove_source_appendix


@pytest.mark.parametrize('heading', ['Available citations:', '**Available citations:**', '## References', 'Sources:'])
def test_source_appendix_is_removed_but_inline_citations_remain(heading):
    assert remove_source_appendix(f'Explanation [1].\n\n{heading}\n[1] Source. URL: https://example.org') == 'Explanation [1].'


def test_inline_source_dump_is_removed():
    assert remove_source_appendix('Explanation [1].\nAvailable citations: [1] Source https://example.org') == 'Explanation [1].'


@pytest.mark.parametrize('marker', ['【1】', '〔1〕', '[1, 2]', '【1，2】'])
def test_all_supported_citation_markers_are_cleaned(marker):
    assert remove_source_appendix(f'Explanation {marker}.\nAvailable citations: {marker} Source title.') == f'Explanation {marker}.'


@pytest.mark.parametrize('answer', ['Sources of pain include several causes [1].', '## Sources\nAn explanation without a bibliography.', 'Seek care [1].\nVisit https://example.org for help.'])
def test_narrative_and_nonbibliography_links_are_preserved(answer):
    assert remove_source_appendix(answer) == answer


def test_later_clinical_heading_is_preserved():
    answer = 'Explanation [1].\n\n## References\n[1] Source https://example.org\n\n## When to seek care\nSeek urgent help [1].'
    assert remove_source_appendix(answer) == 'Explanation [1].\n\n## When to seek care\nSeek urgent help [1].'
