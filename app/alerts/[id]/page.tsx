"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Alert } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AlertDetailPage() {
  const params = useParams()
  const [alert, setAlert] = useState<Alert | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadAlert(params.id as string)
    }
  }, [params.id])

  const loadAlert = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error

      setAlert(data)
    } catch (error) {
      console.error('Error loading alert:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white'
      case 'warning':
        return 'bg-orange-500 text-white'
      case 'watch':
        return 'bg-yellow-500 text-black'
      case 'info':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading alert...</p>
        </div>
      </div>
    )
  }

  if (!alert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <p className="text-slate-600">Alert not found</p>
          <Link href="/alerts">
            <Button className="mt-4">Back to Alerts</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">Alert Details</h1>
            </div>
            <Link href="/alerts">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Alerts
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Alert Overview</CardTitle>
                <Badge className={getSeverityColor(alert.severity)}>
                  {alert.severity.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="font-semibold text-slate-900">{alert.primary_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="font-semibold text-slate-900 capitalize">{alert.status}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Final Score</p>
                  <p className="font-semibold text-slate-900">
                    {(alert.final_score * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {alert.recommended_action && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Recommended Action</p>
                  <p className="text-slate-900 bg-blue-50 p-3 rounded-lg">
                    {alert.recommended_action}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Component Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(alert.component_scores).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {key}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {((value as number) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(value as number) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Evidence ({alert.evidence?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {alert.evidence && alert.evidence.length > 0 ? (
                <div className="space-y-4">
                  {alert.evidence.map((ev: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{ev.type}</p>
                          <p className="text-sm text-slate-500">Source: {ev.source}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(ev.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="mt-3 bg-slate-50 p-3 rounded">
                        <pre className="text-xs text-slate-700 overflow-auto">
                          {JSON.stringify(ev.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No evidence available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
