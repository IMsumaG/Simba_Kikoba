import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
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
import { auth, db } from '../../services/firebase';
import { groupCodeService } from '../../services/groupCodeService';
import { validateEmail, validateGroupCodeFormat, validateName, validatePassword, validatePasswordMatch } from '../../services/validationService';

export default function SignUpScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [groupCode, setGroupCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignUp = async () => {
        // Validate name
        const nameValidation = validateName(name);
        if (!nameValidation.isValid) {
            setError(nameValidation.error || 'Invalid name');
            return;
        }

        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            setError(emailValidation.error || 'Invalid email');
            return;
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setError(passwordValidation.error || 'Invalid password');
            return;
        }

        // Validate password match
        const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
        if (!passwordMatchValidation.isValid) {
            setError(passwordMatchValidation.error || 'Passwords do not match');
            return;
        }

        // Validate group code format
        const groupCodeValidation = validateGroupCodeFormat(groupCode);
        if (!groupCodeValidation.isValid) {
            setError(groupCodeValidation.error || 'Invalid group code');
            return;
        }

        setLoading(true);
        setError('');
        try {
            // 1. Validate group code against Firebase
            const codeValidation = await groupCodeService.validateGroupCode(groupCode);
            if (!codeValidation.isValid) {
                setError(codeValidation.error || 'Invalid group code');
                setLoading(false);
                return;
            }

            // 2. Create user in Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            const user = userCredential.user;

            // 3. Update profile with name
            await updateProfile(user, { displayName: name.trim() });

            // 4. Create user document in Firestore with 'Member' role and group code
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                displayName: name.trim(),
                email: email.trim().toLowerCase(),
                role: 'Member',
                groupCode: groupCode.trim().toUpperCase(),
                createdAt: new Date().toISOString(),
                status: 'Active',
            });

            // 5. Increment redemption count for the group code
            await groupCodeService.incrementRedemptionCount(groupCode);

            router.replace('/(tabs)');
        } catch (error) {
            const err = error as any;
            // Provide user-friendly error messages
            if (err.code === 'auth/email-already-in-use') {
                setError(t('auth.alreadyHaveAccount'));
            } else if (err.code === 'auth/weak-password') {
                setError(t('auth.invalidPassword'));
            } else if (err.code === 'auth/invalid-email') {
                setError(t('auth.invalidEmail'));
            } else {
                setError(err.message || t('common.error'));
            }
            console.error(err);
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
                            <Text style={styles.title}>{t('common.signup')}</Text>
                            <Text style={styles.subtitle}>{t('auth.join')}</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('common.fullName')}</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="John Doe"
                                        placeholderTextColor={Colors.textDisabled}
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </View>

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

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('common.password')}</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor={Colors.textDisabled}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                                        <Ionicons
                                            name={showPassword ? "eye-outline" : "eye-off-outline"}
                                            size={20}
                                            color={Colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('common.confirmPassword')}</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor={Colors.textDisabled}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                                        <Ionicons
                                            name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                                            size={20}
                                            color={Colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('common.groupCode')}</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="key-outline" size={20} color={Colors.textSecondary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g., SIMB2025"
                                        placeholderTextColor={Colors.textDisabled}
                                        value={groupCode}
                                        onChangeText={setGroupCode}
                                        autoCapitalize="characters"
                                    />
                                </View>
                                <Text style={styles.hint}>{t('auth.groupCodeHint')}</Text>
                            </View>

                            {error ? (
                                <Text style={styles.error}>{error}</Text>
                            ) : null}

                            <TouchableOpacity
                                onPress={handleSignUp}
                                disabled={loading}
                                style={styles.button}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <View style={styles.buttonContent}>
                                        <Text style={styles.buttonText}>{t('common.signup')}</Text>
                                        <Ionicons name="person-add-outline" size={20} color="white" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')} </Text>
                            <TouchableOpacity onPress={() => router.push('/login' as any)}>
                                <Text style={styles.linkText}>{t('common.login')}</Text>
                            </TouchableOpacity>
                        </View>
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
    error: {
        color: '#EF4444',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
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
    hint: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 6,
        marginLeft: 4,
        fontStyle: 'italic',
    },
});
