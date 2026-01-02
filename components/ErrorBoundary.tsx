/**
 * Error Boundary Component
 * Catches and displays errors gracefully instead of crashing the app
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { errorHandler } from '../services/errorHandler';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error for debugging
        errorHandler.log(error, 'ErrorBoundary');
        
        this.setState({
            errorInfo: errorInfo.componentStack || '',
        });
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): React.ReactNode {
        if (this.state.hasError) {
            const error = this.state.error;
            const handled = errorHandler.handle(error);

            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Error Icon */}
                        <View style={styles.iconContainer}>
                            <Text style={styles.icon}>⚠️</Text>
                        </View>

                        {/* Error Title */}
                        <Text style={styles.title}>Oops! Something went wrong</Text>

                        {/* Error Message */}
                        <Text style={styles.message}>
                            {handled.userMessage}
                        </Text>

                        {/* Error Details (Development Only) */}
                        {__DEV__ && (
                            <>
                                <View style={styles.devInfo}>
                                    <Text style={styles.devTitle}>Error Details (Dev Only):</Text>
                                    <Text style={styles.devText}>Code: {handled.code}</Text>
                                    <Text style={styles.devText}>
                                        {error?.message}
                                    </Text>
                                    {this.state.errorInfo && (
                                        <Text style={styles.devStack}>
                                            {this.state.errorInfo}
                                        </Text>
                                    )}
                                </View>
                            </>
                        )}

                        {/* Recovery Info */}
                        <Text style={styles.recoveryText}>
                            Try restarting the app or going back to the home screen.
                        </Text>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.resetButton]}
                            onPress={this.handleReset}
                        >
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 40,
        justifyContent: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    icon: {
        fontSize: 64,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    recoveryText: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 16,
        fontStyle: 'italic',
    },
    devInfo: {
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
        padding: 12,
        marginVertical: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
    },
    devTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#7F1D1D',
        marginBottom: 8,
    },
    devText: {
        fontSize: 11,
        color: '#991B1B',
        marginBottom: 4,
        fontFamily: 'Courier New',
    },
    devStack: {
        fontSize: 10,
        color: '#7F1D1D',
        marginTop: 8,
        fontFamily: 'Courier New',
    },
    buttonContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.backgroundMuted,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetButton: {
        backgroundColor: Colors.primary,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
