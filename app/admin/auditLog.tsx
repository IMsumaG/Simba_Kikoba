import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../services/AuthContext';
import { activityLogger } from '../../services/activityLogger';
import { ActivityLog } from '../../types/ActivityLog';

/**
 * Audit Log Screen
 * 
 * Admin-only screen to view activity logs and audit trail.
 * Shows all user actions with timestamps and details.
 */
export default function AuditLogScreen() {
  const { user: currentUser, userProfile, role } = useAuth();
  const isAdmin = role === 'Admin';

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'transaction' | 'loan' | 'member' | 'user'>('all');
  const [stats, setStats] = useState<any>(null);

  const groupCode = userProfile?.groupCode || 'DEFAULT';

  useEffect(() => {
    if (isAdmin && userProfile) {
      fetchActivities();
      fetchStats();
    }
  }, [isAdmin, userProfile, selectedFilter]);

  const fetchActivities = async () => {
    if (!isAdmin || !groupCode) return;

    setLoading(true);
    try {
      let filter: any = { groupCode, limit: 100 };

      if (selectedFilter !== 'all') {
        filter.entityType = selectedFilter;
      }

      const data = await activityLogger.getActivityLogs(filter);
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!isAdmin || !groupCode) return;

    try {
      const data = await activityLogger.getActivityStats(groupCode);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredActivities = activities.filter(activity => {
    const searchLower = search.toLowerCase();
    return (
      activity.description.toLowerCase().includes(searchLower) ||
      activity.userName.toLowerCase().includes(searchLower) ||
      activity.userEmail.toLowerCase().includes(searchLower) ||
      activity.entityName?.toLowerCase().includes(searchLower)
    );
  });

  const getActivityIcon = (activityType: string): any => {
    switch (activityType) {
      case 'transaction_created':
        return 'add-circle-outline';
      case 'transaction_updated':
        return 'create-outline';
      case 'transaction_deleted':
        return 'trash-outline';
      case 'member_added':
        return 'person-add-outline';
      case 'member_deleted':
        return 'person-remove-outline';
      case 'member_status_changed':
        return 'person-outline';
      case 'user_login':
        return 'log-in-outline';
      case 'user_logout':
        return 'log-out-outline';
      case 'loan_approved':
        return 'checkmark-done-circle-outline';
      case 'loan_rejected':
        return 'close-circle-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const getActivityColor = (activityType: string): string => {
    if (activityType.includes('deleted')) return '#EF4444';
    if (activityType.includes('created') || activityType.includes('approved')) return '#10B981';
    if (activityType.includes('updated')) return '#F59E0B';
    return Colors.primary;
  };

  const getStatusColor = (status: 'success' | 'failed' | 'pending'): string => {
    switch (status) {
      case 'success':
        return '#10B981';
      case 'failed':
        return '#EF4444';
      case 'pending':
        return '#F59E0B';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.restrictedContainer}>
          <Ionicons name="lock-closed" size={48} color={Colors.primary} />
          <Text style={styles.restrictedText}>Admin Access Required</Text>
          <Text style={styles.restrictedSubtext}>
            Only administrators can view the audit log
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Audit Log</Text>
          <Text style={styles.subtitle}>Track all system activities</Text>
        </View>

        {/* Statistics */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalActivities}</Text>
              <Text style={styles.statLabel}>Total Activities</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {stats.successRate.toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {stats.failedCount}
              </Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search activities, users, members..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {(['all', 'transaction', 'loan', 'member', 'user'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterBtn,
                selectedFilter === filter && styles.filterBtnActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  selectedFilter === filter && styles.filterBtnTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activity List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <SkeletonLoader height={80} count={5} marginVertical={12} borderRadius={16} />
          </View>
        ) : filteredActivities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>No activities found</Text>
          </View>
        ) : (
          <View style={styles.activitiesList}>
            {filteredActivities.map((activity) => (
              <View key={activity.id} style={styles.activityCard}>
                <View style={styles.activityCardContent}>
                  {/* Icon and Status */}
                  <View style={styles.activityHeader}>
                    <View
                      style={[
                        styles.activityIcon,
                        { backgroundColor: getActivityColor(activity.activityType) + '20' },
                      ]}
                    >
                      <Ionicons
                        name={getActivityIcon(activity.activityType)}
                        size={24}
                        color={getActivityColor(activity.activityType)}
                      />
                    </View>

                    <View style={styles.activityInfo}>
                      <Text style={styles.activityDescription}>
                        {activity.description}
                      </Text>
                      <Text style={styles.activityTimestamp}>
                        {formatDate(activity.createdAtISO)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(activity.status) + '20' },
                      ]}
                    >
                      <Ionicons
                        name={
                          activity.status === 'success'
                            ? 'checkmark-circle'
                            : activity.status === 'failed'
                              ? 'close-circle'
                              : 'time'
                        }
                        size={16}
                        color={getStatusColor(activity.status)}
                      />
                    </View>
                  </View>

                  {/* Details */}
                  <View style={styles.activityDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>By:</Text>
                      <Text style={styles.detailValue}>{activity.userName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Entity:</Text>
                      <Text style={styles.detailValue}>
                        {activity.entityName || activity.entityType}
                      </Text>
                    </View>
                    {activity.metadata.transactionAmount && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount:</Text>
                        <Text style={[styles.detailValue, { color: '#10B981' }]}>
                          {activity.metadata.transactionAmount.toLocaleString()} TSh
                        </Text>
                      </View>
                    )}
                    {activity.status === 'failed' && activity.failureReason && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: '#EF4444' }]}>
                          Error:
                        </Text>
                        <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                          {activity.failureReason}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterBtnTextActive: {
    color: 'white',
  },
  loadingContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
  },
  activitiesList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  activityCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  activityCardContent: {
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  activityTimestamp: {
    fontSize: 12,
    color: '#94A3B8',
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  activityDetails: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0F172A',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  restrictedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  restrictedSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
