describe('supabase-adapter deduplicateMessages', () => {
  function loadAdapter({ pages, deletedRows = [], deleteError = null }) {
    jest.resetModules();

    let pageIndex = 0;
    const deleteSelect = jest.fn().mockResolvedValue({ data: deletedRows, error: deleteError });
    const deleteIn = jest.fn().mockReturnValue({ select: deleteSelect });
    const deleteFn = jest.fn().mockReturnValue({ in: deleteIn });
    const range = jest.fn().mockImplementation(() => {
      const data = pages[pageIndex] || [];
      pageIndex += 1;
      return Promise.resolve({ data, error: null });
    });
    const order = jest.fn().mockReturnValue({ range });
    const select = jest.fn().mockReturnValue({ order });
    const from = jest.fn().mockReturnValue({ select, delete: deleteFn });

    jest.doMock('../lib/supabase', () => ({
      supabase: { from },
      users: {
        create: jest.fn(),
        findByMobile: jest.fn(),
        findById: jest.fn(),
        verifyPassword: jest.fn(),
        getAll: jest.fn(),
        updateProfile: jest.fn()
      },
      messages: {
        create: jest.fn(),
        createBatch: jest.fn(),
        delete: jest.fn(),
        deleteMultiple: jest.fn(),
        getFilterValues: jest.fn(),
        get: jest.fn()
      },
      regions: {
        getAll: jest.fn(),
        create: jest.fn()
      },
      generateId: jest.fn(),
      generateToken: jest.fn(),
      verifyToken: jest.fn(),
      corsHeaders: {}
    }));

    // eslint-disable-next-line global-require
    const adapter = require('../lib/supabase-adapter');
    return { adapter, deleteSelect };
  }

  it('returns verified deleted count when duplicate rows are actually removed', async () => {
    const { adapter } = loadAdapter({
      pages: [[
        { id: '2', sender_name: 'Ali', sender_mobile: '010', message: 'unit', created_at: '2026-01-02' },
        { id: '1', sender_name: 'Ali', sender_mobile: '010', message: 'unit', created_at: '2026-01-01' }
      ], []],
      deletedRows: [{ id: '1' }]
    });

    const result = await adapter.deduplicateMessages();

    expect(result).toEqual({
      success: true,
      originalCount: 2,
      duplicatesRemoved: 1,
      newTotalCount: 1
    });
  });

  it('throws when delete verification does not match detected duplicates', async () => {
    const { adapter } = loadAdapter({
      pages: [[
        { id: '2', sender_name: 'Ali', sender_mobile: '010', message: 'unit', created_at: '2026-01-02' },
        { id: '1', sender_name: 'Ali', sender_mobile: '010', message: 'unit', created_at: '2026-01-01' }
      ], []],
      deletedRows: []
    });

    await expect(adapter.deduplicateMessages()).rejects.toThrow(
      'Delete verification failed: expected 1 duplicates, deleted 0.'
    );
  });
});
