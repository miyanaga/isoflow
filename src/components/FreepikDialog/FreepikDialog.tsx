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
  CardContent,
  CardActionArea,
  Chip,
  IconButton,
  InputAdornment,
  Pagination,
  Checkbox,
  FormControlLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { api, getIsoProjectionCss } from 'src/utils';
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
  searchKeyword?: string; // Track which keyword found this icon
}

interface GroupedIcons {
  setInfo: {
    id: string;
    name: string;
    slug?: string;
  };
  icons: FreepikIcon[];
}

interface Props {
  onClose: () => void;
  onSelectIcon?: (icon: FreepikIcon) => void;
}

type IconType = 'isometric' | 'flat';

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
  const [iconType, setIconType] = useState<IconType>('isometric');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [searchIsometric, setSearchIsometric] = useState(true);
  const [groupedResults, setGroupedResults] = useState<GroupedIcons[]>([]);

  const handleSearch = useCallback(async (page: number = 1) => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSearchedQuery(searchQuery);

    try {
      // Split keywords by comma and trim
      const keywords = searchQuery.split(',').map(k => k.trim()).filter(k => k);

      // Prepare search promises for parallel execution
      const searchPromises = keywords.map(async (keyword) => {
        // Add isometric to keyword if checkbox is checked
        const finalKeyword = searchIsometric ? `${keyword} isometric` : keyword;

        const response = await api.freepik.search(finalKeyword, {
          per_page: 100,  // Maximum allowed by API
          page,
          thumbnail_size: 256
        });

        // Add search keyword to each icon for tracking
        return response.data.map((icon: FreepikIcon) => ({
          ...icon,
          searchKeyword: keyword
        }));
      });

      // Execute all searches in parallel
      const allResults = await Promise.all(searchPromises);

      // Flatten and merge results
      const mergedResults = allResults.flat();

      // Remove duplicates based on icon ID
      const uniqueResults = Array.from(
        new Map(mergedResults.map(icon => [icon.id, icon])).values()
      );

      // Group by icon set
      const grouped = groupIconsBySet(uniqueResults);

      setSearchResults(uniqueResults);
      setGroupedResults(grouped);
      setTotalResults(uniqueResults.length);
      setTotalPages(Math.ceil(uniqueResults.length / 100));
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || 'Failed to search icons');
      setSearchResults([]);
      setGroupedResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchIsometric]);


  const groupIconsBySet = useCallback((icons: FreepikIcon[]): GroupedIcons[] => {
    const groups = new Map<string, GroupedIcons>();

    icons.forEach(icon => {
      // Use style as the grouping key (e.g., "Generic Isometric", "Basic Miscellany Lineal")
      const styleName = typeof icon.style === 'string' ? icon.style : icon.style?.name;
      const setId = styleName || 'no-style';
      const setName = styleName || 'Individual Icons';

      if (!groups.has(setId)) {
        groups.set(setId, {
          setInfo: {
            id: setId,
            name: setName,
            slug: setId.toLowerCase().replace(/\s+/g, '-')
          },
          icons: []
        });
      }

      groups.get(setId)!.icons.push(icon);
    });

    // Convert to array and sort by icon count (descending)
    const groupArray = Array.from(groups.values());
    groupArray.sort((a, b) => b.icons.length - a.icons.length);

    // Sort icons within each group by search keyword
    groupArray.forEach(group => {
      group.icons.sort((a, b) => {
        const keywordA = a.searchKeyword || '';
        const keywordB = b.searchKeyword || '';
        return keywordA.localeCompare(keywordB);
      });
    });

    return groupArray;
  }, []);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setGroupedResults([]);
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
        // Generate a unique name for the icon with type suffix
        const baseName = `freepik-${icon.name || icon.id}`;
        const iconName = iconType === 'flat' ? `${baseName}-flat` : baseName;

        // Download the icon with type metadata
        await api.icons.download(icon.id, iconName, icon.title, iconType === 'isometric');

        // Remove from downloading set
        downloadingRef.current.delete(icon.id);

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

            // Don't close dialog - user may want to download more icons
          }
        }, 500); // Wait 500ms for sync
      } catch (error: any) {
        setDownloadError(error.message || 'Failed to download icon');
        downloadingRef.current.delete(icon.id);
      }
    },
    [modelActions, scene, triggerSync, iconType]
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
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              fullWidth
              label="Search icons"
              placeholder="Enter keywords separated by comma (e.g., server, file, cloud)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(1);
                }
              }}
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
            <FormControlLabel
              control={
                <Checkbox
                  checked={searchIsometric}
                  onChange={(e) => setSearchIsometric(e.target.checked)}
                />
              }
              label="Isometric"
            />
          </Stack>

          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          {downloadError && (
            <Alert severity="error">{downloadError}</Alert>
          )}

          {totalResults > 0 && !isLoading && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Found {totalResults} results for "{searchedQuery}"
              </Typography>
              <Box>
                <Typography variant="caption" color="text.secondary">Import Type:</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Button
                    size="small"
                    variant={iconType === 'isometric' ? 'contained' : 'outlined'}
                    onClick={() => setIconType('isometric')}
                  >
                    Isometric
                  </Button>
                  <Button
                    size="small"
                    variant={iconType === 'flat' ? 'contained' : 'outlined'}
                    onClick={() => setIconType('flat')}
                  >
                    Flat
                  </Button>
                </Stack>
              </Box>
            </Stack>
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
              {groupedResults.length > 0 ? (
                <Stack spacing={2}>
                  {groupedResults.map((group) => (
                    <Accordion key={group.setInfo.id} defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                          <Typography variant="h6">
                            {group.setInfo.name}
                          </Typography>
                          <Chip label={`${group.icons.length} icons`} size="small" />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          {group.icons.map((icon) => {
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
                          <Box
                            sx={{
                              height: 120,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'grey.50',
                              p: 2,
                              overflow: 'hidden'
                            }}
                          >
                            <img
                              src={getThumbnailUrl(icon)}
                              alt={icon.title}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                transform: iconType === 'flat' ?
                                  `${getIsoProjectionCss()} scaleX(-1)` :
                                  'none'
                              }}
                            />
                          </Box>
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
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              ) : (
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
                            <Box
                              sx={{
                                height: 120,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'grey.50',
                                p: 2,
                                overflow: 'hidden'
                              }}
                            >
                              <img
                                src={getThumbnailUrl(icon)}
                                alt={icon.title}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain',
                                  transform: iconType === 'flat' ?
                                    `${getIsoProjectionCss()} scaleX(-1)` :
                                    'none'
                                }}
                              />
                            </Box>
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
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}

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