import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { auth } from '../../services/firebase';
import { validateEmail } from '../../services/validationService';

export default function ForgotPasswordScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async () => {
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            Alert.alert('Invalid Email', emailValidation.error || 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email.trim().toLowerCase());
            setSuccess(true);
        } catch (error: any) {
            console.error('Password reset error:', error);
            let message = 'Failed to send reset email. Please try again.';
            if (error.code === 'auth/user-not-found') {
                message = 'No account found with this email address.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Too many requests. Please try again later.';
            }
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.title}>{t('auth.resetPassword')}</Text>
                            <Text style={styles.subtitle}>
                                {success
                                    ? t('auth.checkInbox')
                                    : t('auth.groupCodeHint')}
                            </Text>
                        </View>

                        {success ? (
                            <View style={styles.successContainer}>
                                <View style={styles.successIcon}>
                                    <Ionicons name="mail-unread-outline" size={60} color={Colors.primary} />
                                </View>
                                <Text style={styles.successText}>
                                    {t('auth.resetLinkSent')}
                                </Text>
                                <Text style={styles.emailText}>{email.trim().toLowerCase()}</Text>
                                <Text style={styles.infoText}>
                                    {t('auth.spamFolderHint')}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => router.replace('/login')}
                                    style={styles.button}
                                >
                                    <Text style={styles.buttonText}>{t('auth.backToLogin')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setSuccess(false)}
                                    style={styles.resendButton}
                                >
                                    <Text style={styles.resendText}>{t('auth.tryAnotherEmail')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('common.email')}</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="name@example.com"
                                            placeholderTextColor={Colors.textDisabled}
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={handleResetPassword}
                                    disabled={loading}
                                    style={styles.button}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.buttonText}>{t('auth.sendResetLink')}</Text>
                                            <Ionicons name="paper-plane-outline" size={20} color="white" />
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.footer}>
                                    <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')} </Text>
                                    <TouchableOpacity onPress={() => router.back()}>
                                        <Text style={styles.linkText}>{t('common.login')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 32,
        paddingVertical: 48,
    },
    header: {
        marginTop: 20,
        marginBottom: 40,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.backgroundMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        color: Colors.textPrimary,
        fontSize: 30,
        fontWeight: 'bold',
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: 16,
        marginTop: 8,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        color: Colors.textSecondary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundMuted,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 20,
        paddingHorizontal: 24,
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    successContainer: {
        alignItems: 'center',
        paddingTop: 20,
    },
    successIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F0F9FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    successText: {
        fontSize: 18,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    emailText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginTop: 8,
        marginBottom: 24,
    },
    infoText: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 20,
        marginBottom: 32,
    },
    resendButton: {
        marginTop: 24,
        padding: 8,
    },
    resendText: {
        color: Colors.textSecondary,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    linkText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
});
