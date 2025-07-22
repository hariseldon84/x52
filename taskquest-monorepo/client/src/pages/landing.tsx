import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Users, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen github-dark text-primary">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            TaskQuest
          </h1>
          <p className="text-xl text-secondary mb-8 max-w-2xl mx-auto">
            Level up your productivity with gamified task management and intelligent CRM. 
            Transform your daily goals into an epic journey.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            className="bg-accent-blue hover:bg-blue-600 text-white px-8 py-3 text-lg"
          >
            Start Your Quest
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="github-secondary border-github-border">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-accent-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-primary">Goal Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary text-center">
                Organize your life with Goals → Projects → Tasks structure
              </p>
            </CardContent>
          </Card>

          <Card className="github-secondary border-github-border">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-accent-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-primary">XP System</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary text-center">
                Earn XP points for completing tasks and level up your productivity
              </p>
            </CardContent>
          </Card>

          <Card className="github-secondary border-github-border">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-accent-crimson rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-primary">Personal CRM</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary text-center">
                Manage contacts, track conversations, and follow up effortlessly
              </p>
            </CardContent>
          </Card>

          <Card className="github-secondary border-github-border">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-primary">Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary text-center">
                Unlock achievements and maintain streaks for consistent progress
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Screenshots/Demo */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-8 text-primary">Ready to Level Up?</h2>
          <p className="text-lg text-secondary mb-8">
            Join thousands of productive users who have transformed their daily routine into an engaging game.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white px-8 py-3 text-lg"
          >
            Begin Your Journey
          </Button>
        </div>
      </div>
    </div>
  );
}
