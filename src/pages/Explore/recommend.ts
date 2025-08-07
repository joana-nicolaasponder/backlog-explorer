// [DEPRECATED] This file is obsolete. Recommendation API logic has moved to the Express backend (server/index.js).
// Safe to delete.
    } else {
      console.log('[recommend] Inserted recommendation_history row:', insertPayload);
    }
    res.status(200).json({ recommendation: reply })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    console.error('Recommendation error:', error);
    res.status(500).json({ error: errMsg });
  }
}
