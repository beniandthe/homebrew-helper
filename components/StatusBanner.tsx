import { Pressable, StyleSheet, View } from 'react-native';
import { BodyText, Label } from '@/components/AppText';
import { Colors, Spacing } from '@/constants/theme';

export type StatusBannerVariant = 'success' | 'error' | 'info';

type StatusBannerProps = {
    title?: string;
    message: string;
    variant?: StatusBannerVariant;
    onDismiss?: () => void;
};

export function StatusBanner({
    title,
    message,
    variant = 'info',
    onDismiss,
}: StatusBannerProps) {
    const containerStyle =
        variant === 'success'
            ? styles.successContainer
            : variant === 'error'
                ? styles.errorContainer
                : styles.infoContainer;

    const textStyle =
        variant === 'success'
            ? styles.successText
            : variant === 'error'
                ? styles.errorText
                : styles.infoText;

    return (
        <View style={[styles.container, containerStyle]}>
            <View style={styles.content}>
                {title ? (
                    <Label style={[styles.title, textStyle]}>
                        {title}
                    </Label>
                ) : null}

                <BodyText style={[styles.message, textStyle]}>
                    {message}
                </BodyText>
            </View>

            {onDismiss ? (
                <Pressable onPress={onDismiss} style={styles.dismissButton}>
                    <BodyText style={[styles.dismissText, textStyle]}>Dismiss</BodyText>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        borderWidth: 1,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    content: {
        gap: 4,
    },
    title: {
        fontWeight: '700',
    },
    message: {
        lineHeight: 20,
    },
    dismissButton: {
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    dismissText: {
        fontWeight: '600',
    },

    successContainer: {
        backgroundColor: '#ecfdf3',
        borderColor: '#a6f4c5',
    },
    errorContainer: {
        backgroundColor: '#fef3f2',
        borderColor: '#fecdca',
    },
    infoContainer: {
        backgroundColor: Colors.elevated,
        borderColor: Colors.border,
    },

    successText: {
        color: '#067647',
    },
    errorText: {
        color: '#b42318',
    },
    infoText: {
        color: Colors.text,
    },
});