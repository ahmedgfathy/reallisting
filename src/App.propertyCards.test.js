import {
  FALLBACK_PROPERTY_IMAGE,
  getPropertyImageUrl,
  buildCompactCardTitle,
  buildCardHeaderMeta,
  truncateCardMessage,
  calculateHasMorePages
} from './App';

describe('property card helpers', () => {
  it('uses fallback image when property image is missing', () => {
    expect(getPropertyImageUrl({ image_url: '' })).toBe(FALLBACK_PROPERTY_IMAGE);
    expect(getPropertyImageUrl({})).toBe(FALLBACK_PROPERTY_IMAGE);
  });

  it('uses provided image when available', () => {
    expect(getPropertyImageUrl({ image_url: ' https://example.com/unit.jpg ' })).toBe('https://example.com/unit.jpg');
  });

  it('builds compact title from main visible fields', () => {
    const formatPurpose = (purpose) => (purpose === 'بيع' ? 'للبيع' : purpose);
    expect(buildCompactCardTitle({ property_type: 'عمارة', category: 'معروض', purpose: 'بيع' }, formatPurpose)).toBe('عمارة');
    expect(buildCompactCardTitle({ property_type: 'أخرى', category: 'معروض', purpose: 'بيع' }, formatPurpose)).toBe('معروض');
    expect(buildCompactCardTitle({ property_type: 'أخرى', category: 'أخرى', purpose: 'بيع' }, formatPurpose)).toBe('للبيع');
  });

  it('builds card header metadata from category, region and property type', () => {
    expect(buildCardHeaderMeta({ category: 'مطلوب', region: 'الحي 14', property_type: 'شقة' })).toBe('مطلوب | الحي 14 | شقة');
    expect(buildCardHeaderMeta({ category: 'أخرى', region: 'الحي 21', property_type: 'أخرى' })).toBe('الحي 21');
    expect(buildCardHeaderMeta({ category: 'أخرى', region: '', property_type: null })).toBe('عقار');
  });

  it('truncates long messages and handles missing text', () => {
    expect(truncateCardMessage('نص قصير')).toBe('نص قصير');
    expect(truncateCardMessage('')).toBe('لا يوجد وصف');
    expect(truncateCardMessage('1234567890', 5)).toBe('12345...');
  });

  it('calculates pagination continuation safely', () => {
    expect(calculateHasMorePages({ hasMore: true })).toBe(true);
    expect(calculateHasMorePages({ hasMore: false, page: 1, limit: 50, total: 26407 })).toBe(false);
    expect(calculateHasMorePages({ page: 1, limit: 50, total: 26407 })).toBe(true);
    expect(calculateHasMorePages({ page: 529, limit: 50, total: 26407 })).toBe(false);
    expect(calculateHasMorePages({ page: 2, limit: 50, totalPages: 3 })).toBe(true);
    expect(calculateHasMorePages({ page: 3, limit: 50, totalPages: 3 })).toBe(false);
    expect(calculateHasMorePages({ page: 1, limit: 50, currentPageSize: 50 })).toBe(true);
    expect(calculateHasMorePages({ page: 1, limit: 50, currentPageSize: 14 })).toBe(false);
  });
});
