package com.market58tv.signage_player

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Lanza la app automaticamente cuando la Android TV termina de arrancar,
 * para que la cartelera quede funcionando sin intervencion manual.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val launchIntent = Intent(context, MainActivity::class.java)
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(launchIntent)
        }
    }
}
