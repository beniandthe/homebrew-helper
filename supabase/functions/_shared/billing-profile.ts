import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

type ProfileBillingUpdate = {
  is_pro: boolean;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  canceled_at: string | null;
  subscription_status: string | null;
  billing_provider: 'stripe' | 'revenuecat';
  billing_product_id: string | null;
  billing_entitlement_id: string | null;
  billing_store: string | null;
  billing_last_synced_at: string;
  revenuecat_app_user_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

export async function applyProfileBillingUpdate(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: ProfileBillingUpdate
) {
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: userId,
      ...payload,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!payload.is_pro) {
    const { error: downgradeError } = await supabaseAdmin.rpc('downgrade_to_free_and_trim_projects', {
      target_user_id: userId,
    });

    if (downgradeError) {
      throw new Error(downgradeError.message);
    }
  }
}
