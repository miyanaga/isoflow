import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Button,
  Stack,
  Alert,
  TextField,
  Grid,
  CircularProgress,
  Typography,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Chip,
  IconButton,
  InputAdornment,
  Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { api } from 'src/utils';
import { useModelStore } from 'src/stores/modelStore';
import { useScene } from 'src/hooks/useScene';
import { useIconSync } from 'src/hooks/useIconSync';
import { Icon } from 'src/types';
import { v4 as uuidv4 } from 'uuid';

interface FreepikIcon {
  id: string;
  name: string;
  title: string;
  thumbnails: Array<{
    width: number;
    height: number;
    url: string;
  }>;
  author: {
    id: string;
    name: string;
    username: string;
  };
  set?: {
    id: string;
    name: string;
    slug: string;
  };
  family?: {
    id: string;
    name: string;
  };
  style?: string | { name: string };
  tags: string[] | Array<{ name: string; slug: string }>;
}

interface Props {
  onClose: () => void;
  onSelectIcon?: (icon: FreepikIcon) => void;
}

export const FreepikDialog = ({ onClose, onSelectIcon }: Props) => {
  const modelActions = useModelStore((state) => state.actions);
  const scene = useScene();
  const { triggerSync } = useIconSync();
  const downloadingRef = useRef<Set<string>>(new Set());
  const [downloadedIcons, setDownloadedIcons] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FreepikIcon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleSearch = useCallback(async (page: number = 1) => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await api.freepik.search(searchQuery, {
        per_page: 100,  // Maximum allowed by API
        page,
        thumbnail_size: 256
      });

      setSearchResults(response.data);
      setTotalPages(response.meta.pagination.total_pages);
      setTotalResults(response.meta.pagination.total);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || 'Failed to search icons');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);


  const handleClear = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
    setCurrentPage(1);
    setTotalPages(0);
    setTotalResults(0);
    setHasSearched(false);
  }, []);

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, page: number) => {
      handleSearch(page);
    },
    [handleSearch]
  );

  const handleIconDownload = useCallback(
    async (icon: FreepikIcon) => {
      // Prevent multiple downloads of the same icon
      if (downloadingRef.current.has(icon.id)) {
        return;
      }

      downloadingRef.current.add(icon.id);
      setDownloadError(null);

      try {
        // Generate a unique name for the icon
        const iconName = `freepik-${icon.name || icon.id}`;

        // Download the icon
        await api.icons.download(icon.id, iconName, icon.title);

        // Mark as downloaded
        setDownloadedIcons((prev) => new Set([...prev, icon.id]));

        // Sync icons
        await triggerSync();

        // Wait a bit for sync to complete
        setTimeout(async () => {
          // Get the updated icons from model store
          const currentState = modelActions.get();
          const customIcon = currentState.icons.find(
            (i: Icon) => i.collection === 'CUSTOM' && i.id === `custom_${iconName}`
          );

          if (customIcon) {
            // Get center position
            const centerTile = { x: 0, y: 0 };
            const modelItemId = uuidv4();

            // Create model item
            scene.createModelItem({
              id: modelItemId,
              name: icon.title || icon.name,
              icon: customIcon.id
            });

            // Create view item
            scene.createViewItem({
              id: modelItemId,
              tile: centerTile,
              size: 1
            });

            // Close dialog after successful download and placement
            onClose();
          }
        }, 500); // Wait 500ms for sync
      } catch (error: any) {
        setDownloadError(error.message || 'Failed to download icon');
        downloadingRef.current.delete(icon.id);
      }
    },
    [modelActions, scene, triggerSync, onClose]
  );

  const getThumbnailUrl = (icon: FreepikIcon) => {
    const thumbnail = icon.thumbnails.find(t => t.width >= 128) || icon.thumbnails[0];
    return thumbnail?.url || '';
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Search Freepik Icons</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <Box>
            <TextField
              fullWidth
              label="Search icons"
              placeholder="Enter keywords (e.g., home, business, settings)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {searchQuery && (
                      <IconButton onClick={handleClear} edge="end">
                        <ClearIcon />
                      </IconButton>
                    )}
                    <IconButton
                      onClick={() => handleSearch(1)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {isLoading ? <CircularProgress size={24} /> : <SearchIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          {downloadError && (
            <Alert severity="error">{downloadError}</Alert>
          )}

          {totalResults > 0 && !isLoading && (
            <Typography variant="body2" color="text.secondary">
              Found {totalResults} results for "{searchQuery}"
            </Typography>
          )}

          {isLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 200
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={2}>
                {searchResults.map((icon) => {
                  const isDownloading = downloadingRef.current.has(icon.id);
                  const isDownloaded = downloadedIcons.has(icon.id);

                  return (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={icon.id}>
                      <Card
                        sx={{
                          height: '100%',
                          position: 'relative',
                          opacity: isDownloading ? 0.6 : 1
                        }}
                      >
                        <CardActionArea
                          onClick={() => handleIconDownload(icon)}
                          disabled={isDownloading}
                        >
                          <CardMedia
                            component="img"
                            height="120"
                            image={getThumbnailUrl(icon)}
                            alt={icon.title}
                            sx={{
                              objectFit: 'contain',
                              p: 2,
                              bgcolor: 'grey.50'
                            }}
                          />
                          {isDownloaded && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                bgcolor: 'success.main',
                                color: 'white',
                                borderRadius: '50%',
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px'
                              }}
                            >
                              ✓
                            </Box>
                          )}
                          {isDownloading && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)'
                              }}
                            >
                              <CircularProgress size={24} />
                            </Box>
                          )}
                          <CardContent sx={{ p: 1 }}>
                            <Typography
                              variant="caption"
                              component="div"
                              noWrap
                              title={icon.title}
                            >
                              {icon.title}
                            </Typography>
                            {icon.style && (
                              <Chip
                                label={typeof icon.style === 'string' ? icon.style : icon.style.name}
                                size="small"
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}

          {searchResults.length === 0 && !isLoading && !error && hasSearched && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 4
              }}
            >
              <Typography variant="body1" color="text.secondary">
                No results found for "{searchQuery}"
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try different keywords or check your spelling
              </Typography>
            </Box>
          )}

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="text" onClick={onClose}>
              Close
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};