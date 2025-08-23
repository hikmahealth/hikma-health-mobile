# Sync Service Documentation

## Overview

The sync service provides a centralized interface for managing data synchronization between the Hikma Health mobile app and the server (both local and cloud). This service was extracted from the AppNavigator component to enable reusable sync functionality across the entire application.

## Features

- **Automatic server type detection** (local vs cloud)
- **State management** through XState store
- **Error handling** with user notifications
- **Prevention of concurrent sync operations**
- **Support for both local and cloud sync**

## Usage

### Basic Usage

#### Import the service

```typescript
import { startSync } from '@/services/syncService'
```

#### Start a sync operation

```typescript
// Basic sync
await startSync('user@example.com')

// With error handling
try {
  await startSync(currentUser.email)
  console.log('Sync completed successfully')
} catch (error) {
  console.error('Sync failed:', error)
}
```

### Using the `useSync` Hook

The `useSync` hook provides a convenient React interface for sync operations:

```typescript
import { useSync } from '@/hooks/useSync'

function MyComponent() {
  const { 
    isSyncing, 
    startSync, 
    state,
    isFetching,
    isResolving,
    isPushing,
    error 
  } = useSync()

  const handleSync = async () => {
    try {
      await startSync()
      console.log('Sync completed')
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  return (
    <Button 
      onPress={handleSync} 
      disabled={isSyncing}
      title={isSyncing ? 'Syncing...' : 'Sync Now'}
    />
  )
}
```

### Implementation Examples

#### 1. SyncButtonIndicator Component

A reusable button with animated spinning icon during sync:

```typescript
export const SyncButtonIndicator = () => {
  const { isFetching, isResolving, isPushing, isIdle, startSync } = useSync()
  
  // Animated rotation when syncing
  useEffect(() => {
    if (isFetching || isResolving || isPushing) {
      // Start spinning animation
    } else {
      // Stop animation
    }
  }, [isFetching, isResolving, isPushing])

  const handlePress = () => {
    if (isIdle) {
      startSync().catch(console.error)
    }
  }

  return (
    <Pressable onPress={handlePress}>
      <AnimatedIcon />
    </Pressable>
  )
}
```

#### 2. App Drawer Integration

Add sync button to navigation drawer:

```typescript
import { SyncButtonIndicator } from './SyncButtonIndicator'

export const AppDrawer = () => {
  return (
    <DrawerContentScrollView>
      {/* Navigation items */}
      
      <View style={footerStyles}>
        <NetworkStatusIndicator />
        <SyncButtonIndicator />
      </View>
    </DrawerContentScrollView>
  )
}
```

#### 3. Settings Screen Manual Sync

Add manual sync option in settings:

```typescript
export const SyncSettingsScreen = () => {
  const { isSyncing, startSync } = useSync()

  const handleManualSync = async () => {
    try {
      await startSync()
      Alert.alert('Success', 'Sync completed successfully')
    } catch (error) {
      Alert.alert('Error', 'Sync failed. Please try again.')
    }
  }

  return (
    <Screen>
      <TouchableOpacity 
        onPress={handleManualSync}
        disabled={isSyncing}
      >
        <Text>{isSyncing ? 'Syncing...' : 'Manual Sync'}</Text>
      </TouchableOpacity>
    </Screen>
  )
}
```

## API Reference

### `startSync(providerEmail?: string): Promise<void>`

Starts a sync operation with the configured server.

**Parameters:**
- `providerEmail` (optional): Email to check for test accounts

**Returns:** Promise that resolves when sync is complete

**Throws:** Error when:
- Test account attempts to sync
- App is not activated
- Network connection fails
- Server returns an error

### `isSyncAvailable(): Promise<boolean>`

Checks if the app is properly configured for syncing.

**Returns:** Promise resolving to true if sync is available

### `getSyncState(): Sync.StateT`

Gets the current sync state.

**Returns:** Current state: 'idle' | 'fetching' | 'resolving' | 'pushing' | 'error'

### `isSyncing(): boolean`

Checks if a sync operation is in progress.

**Returns:** true if syncing, false if idle or in error state

## Hook API Reference

### `useSync(): UseSyncReturn`

React hook for managing sync operations.

**Returns:**
```typescript
{
  state: string                    // Current sync state
  isSyncing: boolean               // Is sync in progress
  isFetching: boolean              // Is fetching data
  isResolving: boolean             // Is resolving data
  isPushing: boolean               // Is pushing data
  isIdle: boolean                  // Is idle
  hasError: boolean                // Has error occurred
  error?: string                   // Error message if any
  fetched?: number                 // Number of records fetched
  pushed?: number                  // Number of records pushed
  startSync: () => Promise<void>  // Trigger sync
  checkSyncAvailability: () => Promise<boolean>  // Check availability
}
```

## Sync States

The sync process goes through several states:

1. **idle** - No sync in progress
2. **fetching** - Downloading data from server
3. **resolving** - Processing and resolving fetched data
4. **pushing** - Uploading local changes to server
5. **error** - Sync failed with error

## Error Handling

The service handles various error scenarios:

- **Test Account**: Shows alert for test accounts
- **App Not Activated**: Prompts user to activate app
- **Network Errors**: Shows appropriate error messages
- **Local Sync Errors**: Suggests checking Wi-Fi connection

## Best Practices

1. **Check sync state before starting**: Use `isIdle` to prevent concurrent syncs
2. **Handle errors gracefully**: Always wrap sync calls in try-catch
3. **Provide user feedback**: Show loading states and error messages
4. **Automatic sync on login**: Already implemented in AppNavigator
5. **Manual sync option**: Provide users control over sync timing

## Architecture

```
┌─────────────────────┐
│   UI Components     │
│  (SyncButton, etc)  │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │   useSync    │
    │    Hook      │
    └──────┬───────┘
           │
           ▼
  ┌─────────────────┐
  │   syncService   │
  │   (Core Logic)  │
  └────────┬────────┘
           │
           ▼
    ┌──────────────┐        ┌──────────────┐
    │  localSyncDB │        │   syncDB     │
    │  (Local)     │        │   (Cloud)    │
    └──────────────┘        └──────────────┘
```

## Migration from Old Implementation

If you have existing code calling sync directly:

**Before:**
```typescript
// In component
const startSync = async () => {
  // Complex sync logic here
}
```

**After:**
```typescript
// In component
import { useSync } from '@/hooks/useSync'

const { startSync } = useSync()
// That's it! All logic is handled by the service
```

## Testing

The centralized service makes testing easier:

```typescript
// Mock the service
jest.mock('@/services/syncService', () => ({
  startSync: jest.fn(),
  isSyncAvailable: jest.fn(() => Promise.resolve(true)),
}))

// Test component behavior
it('should trigger sync on button press', async () => {
  const { getByText } = render(<SyncButton />)
  fireEvent.press(getByText('Sync'))
  expect(startSync).toHaveBeenCalled()
})
```

## Future Enhancements

- Add sync progress percentage
- Implement sync scheduling
- Add conflict resolution UI
- Support selective sync (by data type)
- Add sync history/logs view